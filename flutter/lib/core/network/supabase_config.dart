import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String url = 'https://kbnwyzrghghfuyrobnaa.supabase.co';
  static const String anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtibnd5enJnaGdoZnV5cm9ibmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzOTUzNTYsImV4cCI6MjA5NDk3MTM1Nn0.gUrkFOK45Y5fiaEdBmDpoIyfoUshUaYzN6-a7unO-W4';

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: url,
      anonKey: anonKey,
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
}
