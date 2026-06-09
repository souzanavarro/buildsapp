import 'package:background_locator_2/background_locator.dart';
import 'package:background_locator_2/settings/android_settings.dart';
import 'package:background_locator_2/settings/ios_settings.dart';
import 'package:background_locator_2/settings/locator_settings.dart';
import 'telemetry_service.dart';

class BackgroundLocationService {
  static Future<void> startLocationService() async {
    await BackgroundLocator.initialize();
    
    await BackgroundLocator.registerLocationUpdate(
      callback,
      initCallback: initCallback,
      disposeCallback: disposeCallback,
      settings: const LocatorSettings(
        accuracy: LocationAccuracy.BALANCED,
        interval: 300, // 5 min
        distanceFilter: 100,
        androidSettings: AndroidSettings(
          notificationTitle: 'Rastreamento Rota Certa',
          notificationMsg: 'Atualizando sua localização em segundo plano',
          wakeLockTime: 60,
          autoStop: false,
        ),
        iosSettings: IOSSettings(
          accuracy: LocationAccuracy.NAVIGATION,
          distanceFilter: 100,
        ),
      ),
    );
  }

  static void callback(location) {
    TelemetryService.updateLocation();
  }

  static void initCallback(params) => print('Location Service Initialized');
  static void disposeCallback() => print('Location Service Disposed');
}
