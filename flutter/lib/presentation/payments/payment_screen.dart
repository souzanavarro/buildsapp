import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

class PaymentScreen extends StatelessWidget {
  final String deliveryId;
  final double amount;
  const PaymentScreen({super.key, required this.deliveryId, required this.amount});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pagamento Pix')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Valor: R\$ ${amount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            QrImageView(data: 'PIX-KEY-PAYMENT-$deliveryId', size: 200),
            const SizedBox(height: 20),
            const Text('Aguardando confirmação do pagamento...'),
          ],
        ),
      ),
    );
  }
}
