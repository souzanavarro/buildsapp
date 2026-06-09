import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class MaintenanceScreen extends StatefulWidget {
  const MaintenanceScreen({super.key});

  @override
  State<MaintenanceScreen> createState() => _MaintenanceScreenState();
}

class _MaintenanceScreenState extends State<MaintenanceScreen> {
  final _odometerController = TextEditingController();
  double _fuelLevel = 0.5;

  Future<void> _saveMaintenance() async {
    final user = Supabase.instance.client.auth.currentUser;
    await Supabase.instance.client.from('vehicle_maintenance').insert({
      'driver_id': user!.id,
      'odometer': int.parse(_odometerController.text),
      'fuel_level': _fuelLevel,
    });
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Manutenção do Veículo')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(controller: _odometerController, decoration: const InputDecoration(labelText: 'Odômetro Atual (km)'), keyboardType: TextInputType.number),
            const SizedBox(height: 20),
            Text('Nível de Combustível: ${(_fuelLevel * 100).toInt()}%'),
            Slider(value: _fuelLevel, onChanged: (v) => setState(() => _fuelLevel = v)),
            const Spacer(),
            ElevatedButton(onPressed: _saveMaintenance, child: const Text('Registrar Manutenção')),
          ],
        ),
      ),
    );
  }
}
