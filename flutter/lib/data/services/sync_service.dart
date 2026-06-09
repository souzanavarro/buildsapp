import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../local/offline_storage.dart';

class SyncService {
  static final supabase = Supabase.instance.client;

  /// Adiciona uma alteração à fila offline (Sincronização Delta)
  static Future<void> addToQueue({
    required String tableName,
    required String recordId,
    required String action,
    required Map<String, dynamic> deltaData,
  }) async {
    final db = await OfflineStorage.database;
    
    // Salva localmente primeiro
    await db.insert('pending_sync', {
      'table_name': tableName,
      'record_id': recordId,
      'action': action,
      'data': jsonEncode(deltaData),
      'created_at': DateTime.now().toIso8601String(),
    });

    // Tenta sincronizar se houver internet
    syncPendingData();
  }

  static Future<void> syncPendingData() async {
    final connectivityResult = await (Connectivity().checkConnectivity());
    if (connectivityResult == ConnectivityResult.none) return;

    final db = await OfflineStorage.database;
    final List<Map<String, dynamic>> pending = await db.query('pending_sync', orderBy: 'created_at ASC');

    for (var item in pending) {
      try {
        final Map<String, dynamic> deltaData = jsonDecode(item['data']);
        final String tableName = item['table_name'];
        final String recordId = item['record_id'];
        final String action = item['action'];
        
        if (action == 'UPDATE') {
          // Delta Sync: Envia apenas os campos alterados
          await supabase.from(tableName).update(deltaData).eq('id', recordId);
        } else if (action == 'INSERT') {
          await supabase.from(tableName).insert(deltaData);
        } else if (action == 'DELETE') {
          await supabase.from(tableName).delete().eq('id', recordId);
        }

        await db.delete('pending_sync', where: 'id = ?', whereArgs: [item['id']]);
      } catch (e) {
        print('Erro na sincronização delta: $e');
        // Incrementa retry_count
        final int retries = (item['retry_count'] as int? ?? 0) + 1;
        await db.update('pending_sync', {
          'retry_count': retries,
          'last_error': e.toString(),
        }, where: 'id = ?', whereArgs: [item['id']]);
        
        if (retries > 5) break; // Para se houver erro persistente
      }
    }
  }
}
