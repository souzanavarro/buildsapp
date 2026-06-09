import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:rota_certa/core/network/supabase_config.dart';

class RouteOptimizationService {
  final _client = SupabaseConfig.client;

  Future<void> optimizeRoute(String driverId) async {
    try {
      // Chama Edge Function para otimização baseada em tráfego (IA)
      final response = await _client.functions.invoke(
        'optimize-route',
        body: {'driver_id': driverId},
      );
      
      if (response.status == 200) {
        // Rota reordenada com sucesso no backend
      }
    } catch (e) {
      print('Erro ao otimizar rota: $e');
    }
  }
}
