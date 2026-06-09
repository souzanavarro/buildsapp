import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class JourneyScreen extends StatefulWidget {
  const JourneyScreen({super.key});

  @override
  State<JourneyScreen> createState() => _JourneyScreenState();
}

class _JourneyScreenState extends State<JourneyScreen> {
  String _currentStatus = 'stopped';
  final _client = Supabase.instance.client;

  Future<void> _updateStatus(String status) async {
    final user = _client.auth.currentUser;
    await _client.from('driver_journey').insert({
      'driver_id': user!.id,
      'status': status,
    });
    setState(() => _currentStatus = status);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Controle de Jornada')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Status Atual: ${_currentStatus.toUpperCase()}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 40),
            ElevatedButton(
              onPressed: () => _updateStatus('driving'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
              child: const Text('Iniciar Direção'),
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: () => _updateStatus('resting'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange, foregroundColor: Colors.white),
              child: const Text('Pausa para Descanso'),
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: () => _updateStatus('stopped'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
              child: const Text('Encerrar Jornada'),
            ),
          ],
        ),
      ),
    );
  }
}
