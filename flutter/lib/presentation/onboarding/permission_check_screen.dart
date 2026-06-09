import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:permission_handler/permission_handler.dart';

class PermissionCheckScreen extends StatefulWidget {
  const PermissionCheckScreen({super.key});

  @override
  State<PermissionCheckScreen> createState() => _PermissionCheckScreenState();
}

class _PermissionCheckScreenState extends State<PermissionCheckScreen> {
  bool _locationActive = false;
  bool _notificationsActive = false;

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    final locationStatus = await Geolocator.checkPermission();
    final notificationStatus = await FirebaseMessaging.instance.getNotificationSettings();
    
    setState(() {
      _locationActive = (locationStatus == LocationPermission.always || locationStatus == LocationPermission.whileInUse);
      _notificationsActive = (notificationStatus.authorizationStatus == AuthorizationStatus.authorized);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Status de Permissões')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildPermissionTile(
            'Localização', 
            _locationActive, 
            'Necessária para telemetria.',
            'Vá em Configurações > Privacidade > Localização e selecione "Sempre".'
          ),
          _buildPermissionTile(
            'Notificações', 
            _notificationsActive, 
            'Necessária para alertas.',
            'Vá em Configurações > Notificações > Rota Certa e ative os alertas.'
          ),
          const SizedBox(height: 20),
          if (!_locationActive || !_notificationsActive)
            ElevatedButton.icon(
              onPressed: () => openAppSettings(),
              icon: const Icon(Icons.settings),
              label: const Text('Corrigir nas Configurações do Sistema'),
            ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: _checkPermissions,
            child: const Text('Verificar Novamente'),
          ),
        ],
      ),
    );
  }

  Widget _buildPermissionTile(String title, bool active, String description, String suggestion) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: ListTile(
          leading: Icon(active ? Icons.check_circle : Icons.error, color: active ? Colors.green : Colors.red),
          title: Text(title),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(description),
              if (!active) ...[
                const SizedBox(height: 8),
                Text('Como corrigir: $suggestion', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blueGrey)),
              ]
            ],
          ),
        ),
      ),
    );
  }
}
