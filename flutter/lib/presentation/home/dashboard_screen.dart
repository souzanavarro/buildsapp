import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../data/services/telemetry_service.dart';
import '../../data/services/sync_service.dart';
import '../../data/services/notification_service.dart';
// BackgroundLocationService removed to avoid duplicate imports if needed or fix path
import '../../data/services/background_location_service.dart';
import '../map/map_screen.dart';
import '../onboarding/permission_check_screen.dart';
import 'route_details_screen.dart';
import 'sync_history_screen.dart';
import 'notification_audit_screen.dart';
import 'performance_screen.dart';
import '../vehicle/maintenance_screen.dart';
import 'checklist_screen.dart';
import '../journey/journey_screen.dart';
import '../../data/services/emergency_service.dart';
import '../../data/services/driving_safety_service.dart';
import '../../data/services/voice_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final List<double> _distanceToNext = []; // Track distance for TTS
  bool _isNearLastStop = false;
  Timer? _telemetryTimer;

  @override
  void initState() {
    super.initState();
    // Inicia monitoramento de telemetria (frenagens/acelerações)
    TelemetryService().startMonitoring();
    
    // Start background location
    BackgroundLocationService.startLocationService();

    // Start periodic telemetry as fallback
    _telemetryTimer = Timer.periodic(const Duration(minutes: 5), (timer) {
      TelemetryService.updateLocation();
    });

    // Initial update
    TelemetryService.updateLocation();

    // Setup connectivity listener for auto-sync
    Connectivity().onConnectivityChanged.listen((ConnectivityResult result) {
      if (result != ConnectivityResult.none) {
        SyncService.syncPendingData();
      }
    });

    _startDistanceMonitoring();
  }

  void _startDistanceMonitoring() {
    // Escuta a localização em tempo real para disparar o TTS ao chegar perto
    TelemetryService.locationStream.listen((location) {
      // Logic for proximity alerts
      // In a real app, we'd compare location with delivery coords
      // VoiceService.speak("Você está chegando ao destino");
    });
  }

  @override
  void dispose() {
    _telemetryTimer?.cancel();
    TelemetryService().stop();
    DrivingSafetyService.stopMonitoring();
    super.dispose();
  }


  @override
  Widget build(BuildContext context) {
    final client = Supabase.instance.client;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Minhas Rotas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.emergency, color: Colors.red),
            tooltip: 'Botão de Pânico',
            onPressed: () {
               EmergencyService.triggerPanic();
               ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Alerta de Emergência Enviado!')));
            },
          ),
          IconButton(
            icon: const Icon(Icons.timer),
            tooltip: 'Jornada',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const JourneyScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.car_repair),
            tooltip: 'Manutenção',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const MaintenanceScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.bar_chart),
            tooltip: 'Performance',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PerformanceScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.history_edu),
            tooltip: 'Auditoria de Notificações',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const NotificationAuditScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.security),
            tooltip: 'Verificar Permissões',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const PermissionCheckScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.sync_problem),
            tooltip: 'Histórico Offline',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const SyncHistoryScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.notification_important),
            tooltip: 'Testar Notificação',
            onPressed: () => NotificationService.sendTestNotification(),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => client.auth.signOut(),
          )
        ],
      ),
      body: StreamBuilder(
        stream: client.from('routes').stream(primaryKey: ['id']),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          
          final routes = snapshot.data!;
          return ListView.builder(
            itemCount: routes.length,
            itemBuilder: (context, index) {
              final route = routes[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.route, color: Colors.blue),
                      title: Text('Rota #${route['id']}'),
                      subtitle: Text('Status: ${route['status']}'),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton.icon(
                            icon: const Icon(Icons.map),
                            label: const Text('Ver Mapa'),
                            onPressed: () => Navigator.push(
                              context, 
                              MaterialPageRoute(builder: (_) => MapScreen(routeId: route['id'].toString()))
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            icon: const Icon(Icons.list),
                            label: const Text('Detalhes'),
                            onPressed: () async {
                              // Video Training check mock
                              final ready = await Navigator.push(
                                context, 
                                MaterialPageRoute(builder: (_) => ChecklistScreen(routeId: route['id'].toString()))
                              );
                              if (ready == true && mounted) {
                                Navigator.push(
                                  context, 
                                  MaterialPageRoute(builder: (_) => RouteDetailsScreen(routeId: route['id'].toString()))
                                );
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
