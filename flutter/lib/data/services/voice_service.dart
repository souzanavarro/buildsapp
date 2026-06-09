import 'package:flutter_tts/flutter_tts.dart';

class VoiceService {
  static final FlutterTts _tts = FlutterTts();

  static Future<void> speak(String text) async {
    await _tts.setLanguage("pt-BR");
    await _tts.setPitch(1.0);
    await _tts.speak(text);
  }
}
