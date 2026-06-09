package com.example.rota_certa

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "deliveries")
data class DeliveryEntity(
    @PrimaryKey val id: String,
    val destination_address: String,
    val latitude: Double,
    val longitude: Double,
    val status: String,
    val sequence: Int,
    val sync_pending: Boolean = false,
    val last_updated: Long = System.currentTimeMillis(),
    val proof_image_path: String? = null,
    val proof_ocr_text: String? = null
)


@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val delivery_id: String,
    val message: String,
    val is_me: Boolean,
    val timestamp: Long = System.currentTimeMillis(),
    val synced: Boolean = false
)



@Entity(tableName = "audit_logs")
data class AuditLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val delivery_id: String,
    val action: String,
    val telemetry_data: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val synced: Boolean = false
)

@Entity(tableName = "journey_stats")
data class JourneyStatsEntity(
    @PrimaryKey val date: String, // YYYY-MM-DD
    val total_km: Double = 0.0,
    val start_time: Long = 0,
    val end_time: Long = 0,
    val deliveries_count: Int = 0
)



@Dao
interface DeliveryDao {
    @Query("SELECT * FROM deliveries ORDER BY sequence ASC")
    fun getAllDeliveries(): Flow<List<DeliveryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(deliveries: List<DeliveryEntity>)

    @Query("UPDATE deliveries SET status = :status, sync_pending = :pending, last_updated = :timestamp, proof_image_path = :imagePath, proof_ocr_text = :ocrText WHERE id = :id")
    suspend fun updateStatusWithProof(id: String, status: String, pending: Boolean, imagePath: String?, ocrText: String?, timestamp: Long = System.currentTimeMillis())

    @Query("UPDATE deliveries SET status = :status, sync_pending = :pending, last_updated = :timestamp WHERE id = :id")
    suspend fun updateStatus(id: String, status: String, pending: Boolean, timestamp: Long = System.currentTimeMillis())

    @Query("SELECT * FROM deliveries WHERE sync_pending = 1")
    suspend fun getPendingDeliveries(): List<DeliveryEntity>

    @Query("DELETE FROM deliveries")
    suspend fun deleteAll()
}

@Dao
interface AuditLogDao {
    @Insert
    suspend fun insertLog(log: AuditLogEntity)

    @Query("SELECT * FROM audit_logs WHERE synced = 0")
    suspend fun getUnsyncedLogs(): List<AuditLogEntity>

    @Query("UPDATE audit_logs SET synced = 1 WHERE id = :id")
    suspend fun markAsSynced(id: Long)
}

@Dao
interface ChatMessageDao {
    @Insert
    suspend fun insertMessage(message: ChatMessageEntity)

    @Query("SELECT * FROM chat_messages WHERE delivery_id = :deliveryId ORDER BY timestamp ASC")
    fun getMessagesForDelivery(deliveryId: String): Flow<List<ChatMessageEntity>>

    @Query("SELECT * FROM chat_messages WHERE synced = 0")
    suspend fun getUnsyncedMessages(): List<ChatMessageEntity>

    @Query("UPDATE chat_messages SET synced = 1 WHERE id = :id")
    suspend fun markAsSynced(id: Long)
}

@Dao
interface JourneyDao {
    @Query("SELECT * FROM journey_stats WHERE date = :date")
    fun getStatsForDate(date: String): Flow<JourneyStatsEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(stats: JourneyStatsEntity)

    @Query("UPDATE journey_stats SET total_km = total_km + :km WHERE date = :date")
    suspend fun addKm(date: String, km: Double)

    @Query("UPDATE journey_stats SET deliveries_count = deliveries_count + 1 WHERE date = :date")
    suspend fun incrementDeliveries(date: String)
}

@Database(entities = [DeliveryEntity::class, AuditLogEntity::class, ChatMessageEntity::class, JourneyStatsEntity::class], version = 4)
abstract class AppDatabase : RoomDatabase() {
    abstract fun deliveryDao(): DeliveryDao
    abstract fun auditLogDao(): AuditLogDao
    abstract fun chatMessageDao(): ChatMessageDao
    abstract fun journeyDao(): JourneyDao




    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "rota_certa_db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
