import 'package:sensors_plus/sensors_plus.dart';
import 'dart:async';

class TelemetryService {
  static final TelemetryService _instance = TelemetryService._internal();
  factory TelemetryService() => _instance;
  TelemetryService._internal();

  StreamSubscription? _accelerometerSub;
  double _brakingScore = 100.0;
  
  void startMonitoring() {
    _accelerometerSub = userAccelerometerEvents.listen((UserAccelerometerEvent event) {
      // Detecção de frenagem brusca (exemplo: desaceleração > 10m/s²)
      if (event.y < -10) {
        _brakingScore -= 5;
        _reportHarshEvent('braking', event.y);
      }
      // Aceleração brusca
      if (event.y > 10) {
        _brakingScore -= 3;
        _reportHarshEvent('acceleration', event.y);
      }
    });
  }

  void _reportHarshEvent(String type, double value) {
    // Enviar para backend via telemetry_service existente
  }

  double get currentScore => _brakingScore.clamp(0, 100);

  void stop() {
    _accelerometerSub?.cancel();
  }
}
