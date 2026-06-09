import 'dart:io';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

class MediaService {
  static Future<File?> compressImage(File file) async {
    final tempDir = await getTemporaryDirectory();
    final targetPath = p.join(tempDir.path, "${DateTime.now().millisecondsSinceEpoch}.jpg");
    
    var result = await FlutterImageCompress.compressAndGetFile(
      file.absolute.path, 
      targetPath,
      quality: 70,
    );
    
    return result != null ? File(result.path) : null;
  }
}
