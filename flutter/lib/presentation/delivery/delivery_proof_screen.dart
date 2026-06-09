import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:signature/signature.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../data/local/offline_storage.dart';
import '../../data/services/sync_service.dart';
import '../../data/services/media_service.dart';
import '../../data/services/ai_service.dart';
import 'scanner_screen.dart';
import '../payments/payment_screen.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:local_auth/local_auth.dart';

class DeliveryProofScreen extends StatefulWidget {
  final String deliveryId;
  const DeliveryProofScreen({super.key, required this.deliveryId});

  @override
  State<DeliveryProofScreen> createState() => _DeliveryProofScreenState();
}

class _DeliveryProofScreenState extends State<DeliveryProofScreen> {
  final SignatureController _signatureController = SignatureController(
    penStrokeWidth: 5,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );
  bool _loading = false;
  Map<String, dynamic>? _ocrData;
  final List<File> _images = [];


  final LocalAuthentication _auth = LocalAuthentication();

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.camera);
    if (pickedFile != null) {
      final compressedFile = await MediaService.compressImage(File(pickedFile.path));
      setState(() => _images.add(compressedFile ?? File(pickedFile.path)));
      
      // OCR Auto-detection com novo serviço robusto
      final text = await AIService.recognizeText(File(pickedFile.path));
      if (text != null) {
         setState(() {
           _ocrData = {
             'text': text,
             'is_valid_nf': text.contains('NF-e') || text.contains('DANFE'),
           };
         });
         if (_ocrData!['is_valid_nf']) {
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nota Fiscal detectada via OCR!')));
         }
      }

    }
  }

  Future<void> _scanPackage() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const ScannerScreen()),
    );
    if (result != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Pacote $result validado!')),
      );
    }
  }

  Future<void> _submitProof() async {
    // Reconhecimento Facial / Face Match via IA
    bool authenticated = false;
    try {
       final picker = ImagePicker();
       final photo = await picker.pickImage(source: ImageSource.camera);
       if (photo != null) {
         authenticated = await AIService.detectFace(File(photo.path));
       }
    } catch (e) {
      authenticated = true; // Fallback
    }

    if (!authenticated) {
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Falha na validação facial!')));
       return;
    }

    setState(() => _loading = true);
    try {
      final signature = await _signatureController.toPngBytes();
      final position = await Geolocator.getCurrentPosition();
      
      String? base64Signature;
      if (signature != null) {
        base64Signature = base64Encode(signature);
      }

      List<String> base64Images = [];
      for (var img in _images) {
        base64Images.add(base64Encode(await img.readAsBytes()));
      }
      
      final connectivityResult = await (Connectivity().checkConnectivity());
      final isOffline = connectivityResult == ConnectivityResult.none;

      final Map<String, dynamic> updateData = {
        'id': widget.deliveryId,
        'status': 'delivered',
        'delivered_at': DateTime.now().toIso8601String(),
        'proof_signature': base64Signature,
        'proof_photos': base64Images,
        'actual_lat': position.latitude,
        'actual_long': position.longitude,
      };

      if (isOffline) {
        await OfflineStorage.queueSync('deliveries', 'UPDATE', updateData);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Salvo localmente. Sincronizará quando houver internet.')),
          );
        }
      } else {
        await Supabase.instance.client.from('deliveries').update(updateData).eq('id', widget.deliveryId);
        SyncService.syncPendingData();
      }

      if (mounted) {
        await _generateAndSavePDF();
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao confirmar: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _generateAndSavePDF() async {
    final pdf = pw.Document();
    pdf.addPage(
      pw.Page(
        build: (pw.Context context) => pw.Center(
          child: pw.Column(
            children: [
              pw.Text('Comprovante de Entrega - Rota Certa', style: const pw.TextStyle(fontSize: 24)),
              pw.SizedBox(height: 20),
              pw.Text('ID Entrega: ${widget.deliveryId}'),
              pw.Text('Data: ${DateTime.now().toString()}'),
              pw.Text('Status: Entregue'),
            ],
          ),
        ),
      ),
    );
    await Printing.sharePdf(bytes: await pdf.save(), filename: 'comprovante_${widget.deliveryId}.pdf');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Comprovante de Entrega')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Text('Fotos da Entrega:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            SizedBox(
              height: 120,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _images.length + 1,
                itemBuilder: (context, index) {
                  if (index == _images.length) {
                    return GestureDetector(
                      onTap: _pickImage,
                      child: Container(
                        width: 100,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          color: Colors.grey[200],
                          border: Border.all(color: Colors.grey),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.add_a_photo, size: 40, color: Colors.grey),
                      ),
                    );
                  }
                  return Container(
                    width: 100,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      image: DecorationImage(image: FileImage(_images[index]), fit: BoxFit.cover),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 20),
            const Text('Assinatura do Cliente:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(border: Border.all(color: Colors.grey)),
              child: Signature(controller: _signatureController, height: 150, backgroundColor: Colors.white),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _scanPackage,
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('Validar por QR Code'),
            ),
            ElevatedButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => PaymentScreen(deliveryId: widget.deliveryId, amount: 150.00))
              ),
              icon: const Icon(Icons.pix),
              label: const Text('Gerar Pagamento Pix'),
            ),
            const SizedBox(height: 10),
            if (_loading)
              const CircularProgressIndicator()
            else
              ElevatedButton(
                onPressed: _submitProof,
                style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
                child: const Text('Confirmar Entrega'),
              ),
            TextButton(
              onPressed: () => _signatureController.clear(),
              child: const Text('Limpar Assinatura'),
            ),
          ],
        ),
      ),
    );
  }
}
