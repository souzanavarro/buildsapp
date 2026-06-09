import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/network/supabase_config.dart';
import 'data/services/notification_service.dart';
import 'data/services/sync_service.dart';
import 'presentation/auth/login_screen.dart';
import 'presentation/home/dashboard_screen.dart';
import 'presentation/home/route_details_screen.dart';
import 'presentation/onboarding/permission_onboarding_screen.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseConfig.initialize();
  await NotificationService.initialize(navigatorKey);
  
  // Tenta sincronizar dados pendentes ao iniciar o app
  SyncService.syncPendingData();
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rota Certa',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      themeMode: ThemeMode.system, // Alterna automaticamente com o sistema
      navigatorKey: navigatorKey,
      routes: {
        '/login': (_) => const LoginScreen(),
        '/dashboard': (_) => const DashboardScreen(),
        '/onboarding': (_) => const PermissionOnboardingScreen(),
      },
      onGenerateRoute: (settings) {
        if (settings.name == '/route-details') {
          final routeId = settings.arguments as String;
          return MaterialPageRoute(
            builder: (_) => RouteDetailsScreen(routeId: routeId),
          );
        }
        return null;
      },
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthState>(
      stream: Supabase.instance.client.auth.onAuthStateChange,
      builder: (context, snapshot) {
        final session = snapshot.data?.session;
        if (session != null) {
          return const PermissionOnboardingScreen();
        }
        return const LoginScreen();
      },
    );
  }
}
