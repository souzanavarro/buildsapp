package com.example.rota_certa

import android.content.Intent
import android.net.Uri
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.content.res.Configuration
import androidx.car.app.CarAppService
import androidx.car.app.CarContext
import androidx.car.app.Session
import androidx.car.app.Screen
import androidx.car.app.model.*
import androidx.car.app.validation.HostValidator

import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import kotlin.math.pow

class RotaCertaCarService : CarAppService() {
    override fun createHostValidator(): HostValidator = HostValidator.ALLOW_ALL_HOSTS_VALIDATOR
    override fun onCreateSession(): Session = RotaCertaSession()
}

class RotaCertaSession : Session() {
    override fun onCreateScreen(intent: Intent): Screen = DeliveryListScreen(carContext)

    override fun onCarConfigurationChanged(newConfiguration: Configuration) {
        super.onCarConfigurationChanged(newConfiguration)
        // O Android Auto gerencia o tema automaticamente, mas invalidar força a atualização dos ícones mockados
    }
}


@Serializable
data class DeliveryItem(
    val id: String,
    val destination_address: String,
    val latitude: Double,
    val longitude: Double,
    val status: String,
    val sequence: Int,
    val updated_at: String? = null
)

class DeliveryListScreen(carContext: CarContext) : Screen(carContext) {
    private var deliveries: List<DeliveryEntity> = emptyList()
    private var isOnline = true
    private var lastProximityAlertId: String? = null
    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private val db = AppDatabase.getDatabase(carContext)
    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }
    
    private val anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtibnd5enJnaGdoZnV5cm9ibmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTUzNTYsImV4cCI6MjA5NDk3MTM1Nn0.gUrkFOK45Y5fiaEdBmDpoIyfoUshUaYzN6-a7unO-W4"
    private val baseUrl = "https://kbnwyzrghghfuyrobnaa.supabase.co/rest/v1/deliveries"

    init {
        observeLocalData()
        checkConnectivity()
        startSyncWorker()
        startProximityMonitor()
    }

    private fun startProximityMonitor() {
        scope.launch {
            while (isActive) {
                checkProximity()
                delay(10000) // Verifica a cada 10 segundos
            }
        }
    }

    private fun checkProximity() {
        // Mock de localização atual (em produção usaria LocationManager)
        val currentLat = -23.5505
        val currentLon = -46.6333
        
        deliveries.firstOrNull { it.status == "in_transit" }?.let { active ->
            val distance = 400.0 // Mock de distância (metros)
            if (distance < 500 && lastProximityAlertId != active.id) {
                lastProximityAlertId = active.id
                // No Android Auto, alertas podem ser MessageTemplates ou Notificações
                invalidate() 
            }
        }
    }


    private fun checkConnectivity() {
        val cm = carContext.getSystemService(ConnectivityManager::class.java)
        val network = cm.activeNetwork
        val capabilities = cm.getNetworkCapabilities(network)
        isOnline = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        invalidate()
    }

    private fun observeLocalData() {
        scope.launch {
            db.deliveryDao().getAllDeliveries().collectLatest { data ->
                deliveries = data
                invalidate()
            }
        }
    }

    private fun startSyncWorker() {
        scope.launch(Dispatchers.IO) {
            while (isActive) {
                if (isOnline) {
                    syncPendingChanges()
                    refreshDataFromServer()
                }
                delay(30000) // Sincroniza a cada 30 segundos se online
            }
        }
    }

    private suspend fun syncPendingChanges() {
        // Sincroniza Entregas (Incluindo Proof of Delivery)
        val pending = db.deliveryDao().getPendingDeliveries()
        for (delivery in pending) {
            val success = if (delivery.proof_image_path != null) {
                syncDeliveryWithProof(delivery)
            } else {
                updateRemoteStatus(delivery.id, delivery.status)
            }
            if (success) {
                db.deliveryDao().updateStatusWithProof(delivery.id, delivery.status, false, delivery.proof_image_path, delivery.proof_ocr_text)
            }
        }

        // Sincroniza Chat
        val pendingMessages = db.chatMessageDao().getUnsyncedMessages()
        for (msg in pendingMessages) {
            if (sendRemoteChatMessage(msg)) {
                db.chatMessageDao().markAsSynced(msg.id)
            }
        }
    }

    private suspend fun syncDeliveryWithProof(delivery: DeliveryEntity): Boolean {
        return try {
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val payload = """
                {
                    "status": "${delivery.status}",
                    "proof_ocr": "${delivery.proof_ocr_text ?: ""}",
                    "offline_sync": true
                }
            """.trimIndent()
            val body = payload.toRequestBody(mediaType)
            val request = Request.Builder()
                .url("$baseUrl?id=eq.${delivery.id}")
                .patch(body)
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $anonKey")
                .build()
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) { false }
    }


    private suspend fun sendRemoteChatMessage(msg: ChatMessageEntity): Boolean {
        return try {
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val body = "{\"delivery_id\": \"${msg.delivery_id}\", \"message\": \"${msg.message}\", \"sender_id\": \"driver_id\"}".toRequestBody(mediaType)
            val request = Request.Builder()
                .url("https://kbnwyzrghghfuyrobnaa.supabase.co/rest/v1/delivery_messages")
                .post(body)
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $anonKey")
                .build()
            client.newCall(request).execute().isSuccessful
        } catch (e: Exception) { false }
    }
    private suspend fun updateRemoteStatus(id: String, status: String): Boolean {
        return try {
            val mediaType = "application/json; charset=utf-8".toMediaType()
            val body = "{\"status\": \"$status\"}".toRequestBody(mediaType)
            val request = Request.Builder()
                .url("$baseUrl?id=eq.$id")
                .patch(body)
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $anonKey")
                .build()
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                db.deliveryDao().updateStatus(id, status, false)
                true
            } else false
        } catch (e: Exception) { false }
    }

    private suspend fun syncChatMessagesFromServer() {

        try {
            val request = Request.Builder()
                .url("https://kbnwyzrghghfuyrobnaa.supabase.co/rest/v1/delivery_messages?select=*")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $anonKey")
                .build()
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val body = response.body?.string()
                if (body != null) {
                    val messages = json.decodeFromString<List<RemoteChatMessage>>(body)
                    for (m in messages) {
                        db.chatMessageDao().insertMessage(ChatMessageEntity(
                            delivery_id = m.delivery_id,
                            message = m.message,
                            is_me = m.sender_id != "central", // Simplificado
                            synced = true,
                            timestamp = m.created_at_timestamp ?: System.currentTimeMillis()
                        ))
                    }
                }
            }
        } catch (e: Exception) {}
    }

    @Serializable
    data class RemoteChatMessage(val delivery_id: String, val message: String, val sender_id: String, val created_at_timestamp: Long? = null)


    private suspend fun refreshDataFromServer() {
        syncChatMessagesFromServer()
        try {

            val request = Request.Builder()
                .url("$baseUrl?select=*&order=sequence.asc")
                .addHeader("apikey", anonKey)
                .addHeader("Authorization", "Bearer $anonKey")
                .build()

            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val body = response.body?.string()
                if (body != null) {
                    val items = json.decodeFromString<List<DeliveryItem>>(body)
                    // Filtra conflitos: só atualiza local se não houver mudança pendente localmente
                    val localPendingIds = db.deliveryDao().getPendingDeliveries().map { it.id }.toSet()
                    val entities = items.map {
                        DeliveryEntity(
                            it.id, it.destination_address, it.latitude, it.longitude, 
                            if (localPendingIds.contains(it.id)) deliveries.find { d -> d.id == it.id }?.status ?: it.status else it.status,
                            it.sequence,
                            localPendingIds.contains(it.id)
                        )
                    }
                    db.deliveryDao().insertAll(entities)
                }
            }
        } catch (e: Exception) {}
    }

    private suspend fun retryWithExponentialBackoff(action: suspend () -> Boolean) {
        var currentDelay = 1000L
        repeat(3) {
            if (action()) return
            delay(currentDelay)
            currentDelay *= 2
        }
    }

    override fun onGetTemplate(): Template {
        val listBuilder = ItemList.Builder()
        val isDarkMode = (carContext.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        val themeLabel = if (isDarkMode) "🌙" else "☀️"
        val connectionStatus = if (isOnline) "ONLINE $themeLabel" else "OFFLINE"

        val actionStrip = ActionStrip.Builder()
            .addAction(Action.Builder().setTitle("Ganhos").setOnClickListener { screenManager.push(EarningsScreen(carContext)) }.build())
            .addAction(Action.Builder().setTitle("Atualizar").setOnClickListener { scope.launch { checkConnectivity(); refreshDataFromServer() } }.build())
            .build()

        
        for (delivery in deliveries) {

            val statusSuffix = if (delivery.sync_pending) " (Pendente ⏳)" else ""
            listBuilder.addItem(
                Row.Builder()
                    .setTitle("${delivery.sequence}. ${delivery.destination_address}")
                    .addText("Status: ${delivery.status.uppercase()}$statusSuffix")
                    .setOnClickListener {
                        screenManager.push(DeliveryDetailScreen(carContext, delivery))
                    }
                    .build()
            )
        }

        return ListTemplate.Builder()
            .setSingleList(listBuilder.build())
            .setTitle("Rota Certa $connectionStatus")
            .setHeaderAction(Action.APP_ICON)
            .setActionStrip(ActionStrip.Builder()
                .addAction(Action.Builder().setTitle("Atualizar").setOnClickListener { scope.launch { checkConnectivity(); refreshDataFromServer() } }.build())
                .build())
            .build()
    }
}

class DeliveryDetailScreen(carContext: CarContext, private val delivery: DeliveryEntity) : Screen(carContext) {
    private val db = AppDatabase.getDatabase(carContext)
    
    override fun onGetTemplate(): Template {
        val hasProof = delivery.status == "completed" // Mock: se concluído, tem comprovante
        val proofStatus = if (hasProof) "CONCLUÍDO ✅" else "PENDENTE 📝"

        val pane = Pane.Builder()
            .addRow(Row.Builder().setTitle("Endereço").addText(delivery.destination_address).build())
            .addRow(Row.Builder().setTitle("Comprovante").addText(proofStatus).build())
            .addRow(Row.Builder().setTitle("Status").addText(delivery.status.uppercase() + if (delivery.sync_pending) " - AGUARDANDO SINCRONIZAÇÃO" else "").build())
            .addAction(Action.Builder().setTitle("Navegar").setBackgroundColor(CarColor.BLUE).setOnClickListener {
                carContext.startCarApp(Intent(CarContext.ACTION_NAVIGATE, Uri.parse("google.navigation:q=${delivery.latitude},${delivery.longitude}")))
            }.build())
            .addAction(Action.Builder().setTitle("Iniciar Rota").setOnClickListener { updateStatus("in_transit", "INÍCIO") }.build())
            .addAction(Action.Builder().setTitle("Suporte").setOnClickListener { screenManager.push(CarChatScreen(carContext, delivery.id)) }.build())
            .addAction(Action.Builder().setTitle("Concluir").setBackgroundColor(CarColor.GREEN).setOnClickListener { 
                // Modo Off-Grid: Permite concluir com OCR mockado se estiver offline
                val ocrMock = "NF-e: 12345 - VALIDADO OFFLINE"
                updateStatus("completed", "FIM", null, ocrMock) 
            }.build())
            .build()


        return PaneTemplate.Builder(pane)
            .setTitle("Entrega #${delivery.sequence}")
            .setHeaderAction(Action.BACK)
            .build()
    }

    private fun updateStatus(newStatus: String, actionName: String, telemetry: String? = null, ocrText: String? = null) {
        CoroutineScope(Dispatchers.IO).launch {
            // Auditoria com telemetria
            db.auditLogDao().insertLog(AuditLogEntity(
                delivery_id = delivery.id, 
                action = actionName,
                telemetry_data = telemetry
            ))
            
            if (newStatus == "completed") {
                val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
                db.journeyDao().incrementDeliveries(today)
                db.journeyDao().addKm(today, 2.5)
            }

            // Atualiza local com suporte a Proof of Delivery (Offline Mode)
            db.deliveryDao().updateStatusWithProof(
                id = delivery.id, 
                status = newStatus, 
                pending = true,
                imagePath = if (ocrText != null) "local_storage/proof_${delivery.id}.jpg" else null,
                ocrText = ocrText
            )
            
            withContext(Dispatchers.Main) {
                invalidate()
            }
        }
    }
}


