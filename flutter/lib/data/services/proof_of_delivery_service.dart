import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:geolocator/geolocator.dart';

class ProofOfDeliveryService {
  final _picker = ImagePicker();
  final _textRecognizer = TextRecognizer();

  Future<Map<String, dynamic>?> captureProof() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.camera);
    if (image == null) return null;

    // OCR no canhoto
    final inputImage = InputImage.fromFilePath(image.path);
    final RecognizedText recognizedText = await _textRecognizer.processImage(inputImage);
    
    // Geolocalização exata
    Position position = await Geolocator.getCurrentPosition();

    return {
      'image_path': image.path,
      'ocr_text': recognizedText.text,
      'latitude': position.latitude,
      'longitude': position.longitude,
      'timestamp': DateTime.now().toIso8601String(),
    };
  }

  void dispose() {
    _textRecognizer.close();
  }
}
