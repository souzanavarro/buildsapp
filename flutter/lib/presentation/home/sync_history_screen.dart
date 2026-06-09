import 'package:flutter/material.dart';
import '../../data/local/offline_storage.dart';
import '../../data/services/sync_service.dart';

class SyncHistoryScreen extends StatefulWidget {
  const SyncHistoryScreen({super.key});

  @override
  State<SyncHistoryScreen> createState() => _SyncHistoryScreenState();
}

class _SyncHistoryScreenState extends State<SyncHistoryScreen> {
  List<Map<String, dynamic>> _pendingItems = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final db = await OfflineStorage.database;
    final data = await db.query('pending_sync', orderBy: 'created_at DESC');
    setState(() => _pendingItems = data);
  }

  Future<void> _retrySync() async {
    await SyncService.syncPendingData();
    _loadHistory();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sincronização Offline'),
        actions: [
          IconButton(icon: const Icon(Icons.sync), onPressed: _retrySync),
        ],
      ),
      body: _pendingItems.isEmpty
          ? const Center(child: Text('Tudo sincronizado!'))
          : ListView.builder(
              itemCount: _pendingItems.length,
              itemBuilder: (context, index) {
                final item = _pendingItems[index];
                final hasError = item['last_error'] != null;
                return ExpansionTile(
                  leading: Icon(
                    hasError ? Icons.error_outline : Icons.cloud_off, 
                    color: hasError ? Colors.red : Colors.orange
                  ),
                  title: Text('${item['table_name']} - ${item['action']}'),
                  subtitle: Text(hasError ? 'Falha: ${item['last_error']}' : 'Aguardando sincronização'),
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Dados Locais:', style: TextStyle(fontWeight: FontWeight.bold)),
                          Text(item['data'] ?? ''),
                          if (item['server_version'] != null) ...[
                            const SizedBox(height: 10),
                            const Text('Versão do Servidor (Conflito):', style: TextStyle(fontWeight: FontWeight.bold)),
                            Text(item['server_version']),
                          ],
                          const SizedBox(height: 10),
                          Text('Tentativas: ${item['retry_count']}'),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
    );
  }
}
