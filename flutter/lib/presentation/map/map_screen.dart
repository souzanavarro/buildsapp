import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_polyline_points/flutter_polyline_points.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mapbox;
import 'dart:math' as math;
import '../../data/models/delivery_model.dart';
import '../../data/services/voice_service.dart';
import '../../data/services/driving_safety_service.dart';

class MapScreen extends StatefulWidget {
  final String routeId;
  const MapScreen({super.key, required this.routeId});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};
  List<Delivery> _deliveries = [];
  bool _useClustering = true;
  
  @override
  void initState() {
    super.initState();
    DrivingSafetyService.startMonitoring(widget.routeId, (alert) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(alert), backgroundColor: Colors.orange),
        );
      }
    });
  }

  @override
  void dispose() {
    DrivingSafetyService.stopMonitoring();
    super.dispose();
  }

  Future<List<Delivery>> _loadDeliveries() async {
    final response = await Supabase.instance.client
        .from('deliveries')
        .select()
        .eq('route_id', widget.routeId);
    
    return (response as List).map((json) => Delivery.fromJson(json)).toList();
  }

  void _createMarkers(List<Delivery> deliveries) {
    _deliveries = deliveries;
    if (deliveries.isNotEmpty) {
      VoiceService.speak("Você tem ${deliveries.length} entregas nesta rota. A próxima é em ${deliveries.first.address}");
    }
    _updateMarkers();
  }

  void _updateMarkers() {
    setState(() {
      _markers.clear();
      if (_useClustering) {
        _markers.addAll(_clusterMarkers(_deliveries));
      } else {
        _markers.addAll(_deliveries.map((d) => Marker(
          markerId: MarkerId(d.id),
          position: LatLng(d.latitude, d.longitude),
          infoWindow: InfoWindow(
            title: d.address,
            snippet: 'Toque para navegar',
            onTap: () => _launchNavigation(d.latitude, d.longitude),
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            d.status == 'delivered' ? BitmapDescriptor.hueGreen : BitmapDescriptor.hueRed
          ),
        )));
      }
      _drawPolylines(_deliveries);
    });
  }

  // Simple grid-based clustering
  List<Marker> _clusterMarkers(List<Delivery> deliveries) {
    if (deliveries.isEmpty) return [];
    
    const double clusterRadius = 0.005; // ~500m
    List<Marker> clusteredMarkers = [];
    List<Delivery> processed = [];

    for (var d in deliveries) {
      if (processed.contains(d)) continue;

      List<Delivery> cluster = deliveries.where((other) {
        if (processed.contains(other)) return false;
        double dist = math.sqrt(
          math.pow(d.latitude - other.latitude, 2) + 
          math.pow(d.longitude - other.longitude, 2)
        );
        return dist < clusterRadius;
      }).toList();

      if (cluster.length > 1) {
        clusteredMarkers.add(Marker(
          markerId: MarkerId('cluster_${d.id}'),
          position: LatLng(d.latitude, d.longitude),
          infoWindow: InfoWindow(title: '${cluster.length} entregas aqui'),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        ));
        processed.addAll(cluster);
      } else {
        clusteredMarkers.add(Marker(
          markerId: MarkerId(d.id),
          position: LatLng(d.latitude, d.longitude),
          infoWindow: InfoWindow(title: d.address),
          icon: BitmapDescriptor.defaultMarkerWithHue(
            d.status == 'delivered' ? BitmapDescriptor.hueGreen : BitmapDescriptor.hueRed
          ),
        ));
        processed.add(d);
      }
    }
    return clusteredMarkers;
  }

  void _drawPolylines(List<Delivery> deliveries) {
    if (deliveries.length < 2) return;
    List<LatLng> points = deliveries.map((d) => LatLng(d.latitude, d.longitude)).toList();
    
    _polylines.clear();
    _polylines.add(Polyline(
      polylineId: const PolylineId('route_path'),
      points: points,
      color: Colors.blue,
      width: 5,
    ));
  }

  void _optimizeRoute() {
    setState(() {
      _deliveries.sort((a, b) => a.sequence.compareTo(b.sequence)); 
      _updateMarkers();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Rota otimizada pela sequência lógica.')),
    );
  }

  Future<void> _launchNavigation(double lat, double lng) async {
    final prefs = await SharedPreferences.getInstance();
    final preferredMap = prefs.getString('preferred_map') ?? 'google';

    Uri url;
    if (preferredMap == 'waze') {
      url = Uri.parse("https://waze.com/ul?ll=$lat,$lng&navigate=yes");
    } else {
      url = Uri.parse("google.navigation:q=$lat,$lng&mode=d");
    }

    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    } else {
      final appleMapsUrl = Uri.parse("http://maps.apple.com/?daddr=$lat,$lng");
      if (await canLaunchUrl(appleMapsUrl)) {
        await launchUrl(appleMapsUrl);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mapa da Rota'),
        actions: [
          IconButton(
            icon: Icon(_useClustering ? Icons.layers : Icons.layers_clear),
            tooltip: 'Alternar Clusterização',
            onPressed: () {
              setState(() {
                _useClustering = !_useClustering;
                _updateMarkers();
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.auto_fix_high),
            tooltip: 'Otimizar Rota',
            onPressed: _optimizeRoute,
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _showSettings,
          )
        ],
      ),
      body: FutureBuilder<List<Delivery>>(
        future: _loadDeliveries(),
        builder: (context, snapshot) {
          if (snapshot.hasData && _markers.isEmpty) {
            WidgetsBinding.instance.addPostFrameCallback((_) => _createMarkers(snapshot.data!));
          }
          
          return GoogleMap(
            initialCameraPosition: const CameraPosition(
              target: LatLng(-23.5505, -46.6333), // Default SP
              zoom: 12,
            ),
            markers: _markers,
            polylines: _polylines,
          );
        },
      ),
    );
  }

  void _showSettings() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    
    showModalBottomSheet(
      context: context,
      builder: (context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const ListTile(title: Text('Preferências de Navegação', style: TextStyle(fontWeight: FontWeight.bold))),
          RadioListTile<String>(
            title: const Text('Google Maps'),
            value: 'google',
            groupValue: prefs.getString('preferred_map') ?? 'google',
            onChanged: (v) {
              prefs.setString('preferred_map', v!);
              Navigator.pop(context);
            },
          ),
          RadioListTile<String>(
            title: const Text('Waze'),
            value: 'waze',
            groupValue: prefs.getString('preferred_map') ?? 'google',
            onChanged: (v) {
              prefs.setString('preferred_map', v!);
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }
}
