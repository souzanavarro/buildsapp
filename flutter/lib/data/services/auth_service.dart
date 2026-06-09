import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:logger/logger.dart';

class AuthService {
  final _client = Supabase.instance.client;
  final _logger = Logger();

  Future<AuthResponse> signIn(String email, String password) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      return response;
    } catch (e) {
      _logger.e('Erro ao fazer login: $e');
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  User? get currentUser => _client.auth.currentUser;
  
  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;
}
