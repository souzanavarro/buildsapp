import 'dart:async';
import 'package:sensors_plus/sensors_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DrivingSafetyService {
  static StreamSubscription? _subscription;
  static const double _brakingThreshold = -15.0; // m/s^2
  static int _harshBraking = 0;
  static int _sharpTurns = 0;
  static int _currentScore = 100;
  static String? _currentRouteId;
  
  static void startMonitoring(String routeId, Function(String) onAlert) {
    _currentRouteId = routeId;
    _harshBraking = 0;
    _sharpTurns = 0;
    _currentScore = 100;

    _subscription = userAccelerometerEvents.listen((UserAccelerometerEvent event) {
      if (event.y < _brakingThreshold) {
        _harshBraking++;
        _currentScore = (_currentScore - 5).clamp(0, 100);
        onAlert("Freada Brusca Detectada! Score: $_currentScore");
        _saveScoreUpdate();
      }
      if (event.x.abs() > 10.0) {
        _sharpTurns++;
        _currentScore = (_currentScore - 3).clamp(0, 100);
        onAlert("Curva Perigosa Detectada! Score: $_currentScore");
        _saveScoreUpdate();
      }
    });
  }

  static Future<void> _saveScoreUpdate() async {
    if (_currentRouteId == null) return;
    
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return;

    try {
      await Supabase.instance.client.from('route_safety_scores').upsert({
        'route_id': _currentRouteId,
        'driver_id': userId,
        'score': _currentScore,
        'harsh_braking_count': _harshBraking,
        'sharp_turn_count': _sharpTurns,
        'updated_at': DateTime.now().toIso8601String(),
      }, onConflict: 'route_id, driver_id');
    } catch (e) {
      print('Erro ao salvar score de segurança: $e');
    }
  }

  static void stopMonitoring() {
    _subscription?.cancel();
    _currentRouteId = null;
  }
}
