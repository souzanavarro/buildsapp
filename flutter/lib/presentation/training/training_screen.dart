import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class TrainingScreen extends StatefulWidget {
  const TrainingScreen({super.key});

  @override
  State<TrainingScreen> createState() => _TrainingScreenState();
}

class _TrainingScreenState extends State<TrainingScreen> {
  late VideoPlayerController _controller;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(
      Uri.parse('https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4'),
    )..initialize().then((_) => setState(() {}));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Treinamento Obrigatório')),
      body: Column(
        children: [
          if (_controller.value.isInitialized)
            AspectRatio(aspectRatio: _controller.value.aspectRatio, child: VideoPlayer(_controller)),
          const SizedBox(height: 20),
          const Padding(
            padding: EdgeInsets.all(16.0),
            child: Text('Assista ao vídeo de segurança para liberar sua rota hoje.'),
          ),
          ElevatedButton(
            onPressed: () {
              _controller.play();
              Future.delayed(const Duration(seconds: 5), () {
                 if (mounted) Navigator.pop(context, true);
              });
            },
            child: const Text('Iniciar Treinamento'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => setState(() => _controller.value.isPlaying ? _controller.pause() : _controller.play()),
        child: Icon(_controller.value.isPlaying ? Icons.pause : Icons.play_arrow),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
