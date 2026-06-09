import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../delivery/delivery_proof_screen.dart';
import '../delivery/chat_screen.dart';

class RouteDetailsScreen extends StatelessWidget {
  final String routeId;
  const RouteDetailsScreen({super.key, required this.routeId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detalhes da Rota')),
      body: StreamBuilder(
        stream: Supabase.instance.client
            .from('deliveries')
            .stream(primaryKey: ['id'])
            .eq('route_id', routeId),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final deliveries = snapshot.data!;
          return ListView.builder(
            itemCount: deliveries.length,
            itemBuilder: (context, index) {
              final delivery = deliveries[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  children: [
                    ListTile(
                      title: Text(delivery['destination_address'] ?? 'Endereço não informado'),
                      subtitle: Text('Status: ${delivery['status']}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.chat_bubble_outline),
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ChatScreen(deliveryId: delivery['id'].toString()),
                              ),
                            ),
                          ),
                          const Icon(Icons.arrow_forward_ios),
                        ],
                      ),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => DeliveryProofScreen(deliveryId: delivery['id'].toString()),
                        ),
                      ),
                    ),
                    if (delivery['status'] == 'pending')
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8.0),
                        child: TextButton.icon(
                          onPressed: () => _updateStatus(delivery['id'].toString(), 'in_route'),
                          icon: const Icon(Icons.local_shipping),
                          label: const Text('Iniciar Entrega'),
                        ),
                      ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _updateStatus(String id, String status) async {
    await Supabase.instance.client.from('deliveries').update({
      'status': status,
    }).eq('id', id);
  }
}
