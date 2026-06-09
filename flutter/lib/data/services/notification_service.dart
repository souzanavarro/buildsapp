import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/material.dart';
import '../../presentation/home/route_details_screen.dart';
import '../../presentation/home/notification_audit_screen.dart';

class NotificationService {
  static final _notifications = FlutterLocalNotificationsPlugin();
  static GlobalKey<NavigatorState>? navigatorKey;

  static Future<void> initialize(GlobalKey<NavigatorState> key) async {
    navigatorKey = key;
    
    // Android Channel Setup
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'high_importance_channel',
      'Alertas de Rota',
      description: 'Notificações críticas de novas rotas e mudanças de status',
      importance: Importance.max,
    );

    await _notifications
        .resolvePlatformSpecificAction<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      ),
    );

    await _notifications.initialize(
      settings,
      onDidReceiveNotificationResponse: (details) {
        if (details.actionId == 'accept') {
          _updateRouteStatus(details.payload, 'accepted');
        } else if (details.actionId == 'decline') {
          _updateRouteStatus(details.payload, 'declined');
        } else if (details.payload != null) {
          _handlePayload(details.payload!);
        }
      },
    );

    // Handle background/terminated messages
    FirebaseMessaging.instance.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        _handlePayload(message.data['route_id']);
      }
    });

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      NotificationAuditScreen.addLog(NotificationAuditLog(
        title: message.notification?.title ?? 'Sem Título',
        body: message.notification?.body ?? 'Sem Corpo',
        routeId: message.data['route_id'],
        timestamp: DateTime.now(),
      ));
      _showNotification(message);
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      NotificationAuditScreen.addLog(NotificationAuditLog(
        title: message.notification?.title ?? 'Sem Título',
        body: message.notification?.body ?? 'Sem Corpo',
        routeId: message.data['route_id'],
        timestamp: DateTime.now(),
        opened: true,
      ));
      _handlePayload(message.data['route_id']);
    });

    // Register token in Supabase
    _updatePushToken();
  }

  static Future<void> _updatePushToken() async {
    final token = await FirebaseMessaging.instance.getToken();
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (token != null && userId != null) {
      await Supabase.instance.client.from('drivers').update({'push_token': token}).eq('id', userId);
    }
  }

  static void _handlePayload(String? routeId) {
    if (routeId != null && navigatorKey != null) {
      // Logic to prevent duplicate pushes or handle deep navigation
      navigatorKey!.currentState?.pushNamed('/route-details', arguments: routeId);
    }
  }

  static void _showNotification(RemoteMessage message) {
    RemoteNotification? notification = message.notification;
    AndroidNotification? android = message.notification?.android;

    if (notification != null) {
      _notifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        NotificationDetails(
          android: AndroidNotificationDetails(
            'high_importance_channel',
            'Alertas de Rota',
            icon: android?.smallIcon,
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
        payload: message.data['route_id'],
      );
    }
  }

  static Future<void> _updateRouteStatus(String? routeId, String status) async {
    if (routeId == null) return;
    try {
      await Supabase.instance.client
          .from('routes')
          .update({'status': status})
          .eq('id', routeId);
      print('Status da rota $routeId atualizado para $status via notificação');
    } catch (e) {
      print('Erro ao atualizar status da rota: $e');
    }
  }

  static Future<void> sendTestNotification() async {
    _notifications.show(
      999,
      'Nova Rota Atribuída',
      'Você recebeu a Rota #123. Deseja aceitar?',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'high_importance_channel',
          'Alertas de Rota',
          importance: Importance.max,
          priority: Priority.high,
          actions: <AndroidNotificationAction>[
            AndroidNotificationAction('accept', 'Aceitar', showsUserInterface: true),
            AndroidNotificationAction('decline', 'Recusar', showsUserInterface: false),
          ],
        ),
      ),
      payload: 'test_route_id',
    );
  }
}
