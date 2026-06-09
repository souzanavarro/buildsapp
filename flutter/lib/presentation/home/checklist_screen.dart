import 'package:flutter/material.dart';

class ChecklistScreen extends StatefulWidget {
  final String routeId;
  const ChecklistScreen({super.key, required this.routeId});

  @override
  State<ChecklistScreen> createState() => _ChecklistScreenState();
}

class _ChecklistScreenState extends State<ChecklistScreen> {
  final Map<String, bool> _items = {'Pneus': false, 'Óleo/Água': false, 'Carga Conferida': false, 'Luzes': false};

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Checklist de Saída')),
      body: Column(
        children: [
          ..._items.keys.map((key) => CheckboxListTile(
            title: Text(key),
            value: _items[key],
            onChanged: (v) => setState(() => _items[key] = v!),
          )),
          const Spacer(),
          ElevatedButton(
            onPressed: _items.values.every((v) => v) ? () => Navigator.pop(context, true) : null,
            child: const Text('Iniciar Rota'),
          ),
        ],
      ),
    );
  }
}
