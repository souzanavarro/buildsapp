import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:permission_handler/permission_handler.dart';
import '../home/dashboard_screen.dart';

class PermissionOnboardingScreen extends StatefulWidget {
  const PermissionOnboardingScreen({super.key});

  @override
  State<PermissionOnboardingScreen> createState() => _PermissionOnboardingScreenState();
}

class _PermissionOnboardingScreenState extends State<PermissionOnboardingScreen> {
  int _currentStep = 0;

  Future<void> _requestLocation() async {
    if (Platform.isAndroid) {
      // Android step-by-step
      await Permission.location.request();
      await Permission.locationAlways.request();
    } else {
      // iOS
      await Geolocator.requestPermission();
    }
    
    final status = await Geolocator.checkPermission();
    if (status == LocationPermission.always || status == LocationPermission.whileInUse) {
      setState(() => _currentStep++);
    } else {
      _showGuidanceDialog('Localização');
    }
  }

  Future<void> _requestNotifications() async {
    NotificationSettings settings = await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      setState(() => _currentStep++);
    } else {
      _showGuidanceDialog('Notificações');
    }
  }

  void _showGuidanceDialog(String type) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Permissão de $type Negada'),
        content: Text(
          Platform.isAndroid 
            ? 'Vá em Configurações > Aplicativos > Rota Certa > Permissões e ative $type (selecione "Permitir o tempo todo" para Localização).'
            : 'Vá em Ajustes > Rota Certa e ative $type.'
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Entendi')),
          ElevatedButton(onPressed: () => openAppSettings(), child: const Text('Abrir Ajustes')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                _currentStep == 0 ? Icons.location_on : Icons.notifications_active,
                size: 80,
                color: Colors.blue,
              ),
              const SizedBox(height: 30),
              Text(
                _currentStep == 0 ? 'Rastreamento em Tempo Real' : 'Fique por dentro das mudanças',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              Text(
                _currentStep == 0 
                  ? 'Para otimizar suas entregas, precisamos acessar sua localização mesmo com o app em segundo plano.'
                  : 'Receba alertas instantâneos quando uma rota for atribuída ou o status de um item for alterado.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600]),
              ),
              const SizedBox(height: 50),
              ElevatedButton(
                onPressed: _currentStep == 0 ? _requestLocation : _requestNotifications,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 55),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(_currentStep == 0 ? 'Habilitar Localização' : 'Ativar Notificações'),
              ),
              if (_currentStep >= 2) ...[
                const SizedBox(height: 20),
                TextButton(
                  onPressed: () => Navigator.pushReplacementNamed(context, '/dashboard'),
                  child: const Text('Começar a Trabalhar', style: TextStyle(fontSize: 18)),
                ),
              ]
            ],
          ),
        ),
      ),
    );
  }
}
