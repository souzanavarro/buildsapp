import 'package:flutter/material.dart';

class NotificationAuditLog {
  final String title;
  final String body;
  final String? routeId;
  final DateTime timestamp;
  final bool opened;

  NotificationAuditLog({
    required this.title,
    required this.body,
    this.routeId,
    required this.timestamp,
    this.opened = false,
  });
}

class NotificationAuditScreen extends StatefulWidget {
  const NotificationAuditScreen({super.key});

  @override
  State<NotificationAuditScreen> createState() => _NotificationAuditScreenState();
}

class _NotificationAuditScreenState extends State<NotificationAuditScreen> {
  static final List<NotificationAuditLog> _logs = [];
  String _filter = '';

  static void addLog(NotificationAuditLog log) => _logs.add(log);

  @override
  Widget build(BuildContext context) {
    final filteredLogs = _logs.where((log) => 
      log.routeId?.contains(_filter) ?? true || log.title.contains(_filter)
    ).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Auditoria de Notificações')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              decoration: const InputDecoration(
                labelText: 'Filtrar por Rota ID ou Título',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _filter = v),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filteredLogs.length,
              itemBuilder: (context, index) {
                final log = filteredLogs[index];
                return ListTile(
                  leading: Icon(log.opened ? Icons.drafts : Icons.mail),
                  title: Text(log.title),
                  subtitle: Text('${log.body}\nRota: ${log.routeId ?? "N/A"}'),
                  trailing: Text(log.timestamp.toString().split('.')[0]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
