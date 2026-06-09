package com.example.rota_certa

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest

class CarChatScreen(carContext: CarContext, private val deliveryId: String) : Screen(carContext) {
    private var messages: List<ChatMessageEntity> = emptyList()
    private val db = AppDatabase.getDatabase(carContext)
    private val scope = CoroutineScope(Dispatchers.Main + Job())

    init {
        scope.launch {
            db.chatMessageDao().getMessagesForDelivery(deliveryId).collectLatest { data ->
                messages = data
                invalidate()
            }
        }
    }

    override fun onGetTemplate(): Template {
        val listBuilder = ItemList.Builder()
        if (messages.isEmpty()) {
            listBuilder.setNoItemsMessage("Sem mensagens no momento.")
        } else {
            for (msg in messages) {
                val prefix = if (msg.is_me) "Eu: " else "Central: "
                val syncStatus = if (!msg.synced && msg.is_me) " (Enviando...)" else ""
                listBuilder.addItem(
                    Row.Builder()
                        .setTitle(prefix + msg.message)
                        .addText(syncStatus)
                        .build()
                )
            }
        }

        val actionStrip = ActionStrip.Builder()
            .addAction(Action.Builder()
                .setTitle("Reportar Pneu")
                .setOnClickListener { sendMessage("Pneu furado na rota") }
                .build())
            .addAction(Action.Builder()
                .setTitle("Cliente Ausente")
                .setOnClickListener { sendMessage("Cliente ausente no endereço") }
                .build())
            .build()

        return ListTemplate.Builder()
            .setSingleList(listBuilder.build())
            .setTitle("Chat de Suporte")
            .setHeaderAction(Action.BACK)
            .setActionStrip(actionStrip)
            .build()
    }

    private fun sendMessage(text: String) {
        scope.launch(Dispatchers.IO) {
            db.chatMessageDao().insertMessage(ChatMessageEntity(delivery_id = deliveryId, message = text, is_me = true))
        }
    }
}

class EarningsScreen(carContext: CarContext) : Screen(carContext) {
    private var stats: JourneyStatsEntity? = null
    private val db = AppDatabase.getDatabase(carContext)
    private val scope = CoroutineScope(Dispatchers.Main + Job())

    init {
        val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
        scope.launch {
            // Inicializa stats se não existir
            db.journeyDao().insertOrUpdate(JourneyStatsEntity(today))
            
            db.journeyDao().getStatsForDate(today).collectLatest { data ->
                stats = data
                invalidate()
            }
        }
    }

    override fun onGetTemplate(): Template {
        val dailyEarnings = (stats?.deliveries_count ?: 0) * 23.80 // Exemplo: R$ 23,80 por entrega
        
        val pane = Pane.Builder()
            .addRow(Row.Builder().setTitle("Ganhos de Hoje").addText("R$ %.2f".format(dailyEarnings)).build())
            .addRow(Row.Builder().setTitle("KM Rodados").addText("${stats?.total_km ?: 0.0} km").build())
            .addRow(Row.Builder().setTitle("Entregas Feitas").addText("${stats?.deliveries_count ?: 0} concluídas").build())
            .addRow(Row.Builder().setTitle("Status Conexão").addText("Sincronizado via Local Cache").build())
            .build()

        return PaneTemplate.Builder(pane)
            .setTitle("Meus Ganhos Reais")
            .setHeaderAction(Action.BACK)
            .build()
    }
}

