import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/services/telemetry_service.dart';

class PerformanceScreen extends StatelessWidget {
  const PerformanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard de Ganhos')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Desempenho de Hoje',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _buildStatCard('Entregas', '12/15', Icons.check_circle, Colors.green),
                _buildStatCard('KM Rodados', '42.5 km', Icons.directions_car, Colors.blue),
              ],
            ),
            Row(
              children: [
                _buildStatCard('Tempo Total', '6h 45m', Icons.timer, Colors.orange),
                _buildStatCard('Score Seguro', '${TelemetryService().currentScore.toInt()}', Icons.security, Colors.purple),
              ],
            ),
            const SizedBox(height: 24),
            const Text(
              'Ganhos Estimados',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const Card(
              margin: EdgeInsets.symmetric(vertical: 8),
              child: ListTile(
                leading: CircleAvatar(backgroundColor: Colors.green, child: Icon(Icons.attach_money, color: Colors.white)),
                title: Text('Total do Dia'),
                trailing: Text('R\$ 285,50', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.green)),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Histórico Semanal',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  barGroups: [
                    BarChartGroupData(x: 1, barRods: [BarChartRodData(toY: 8, color: Colors.blue)]),
                    BarChartGroupData(x: 2, barRods: [BarChartRodData(toY: 12, color: Colors.blue)]),
                    BarChartGroupData(x: 3, barRods: [BarChartRodData(toY: 10, color: Colors.blue)]),
                    BarChartGroupData(x: 4, barRods: [BarChartRodData(toY: 14, color: Colors.blue)]),
                    BarChartGroupData(x: 5, barRods: [BarChartRodData(toY: 9, color: Colors.blue)]),
                  ],
                  borderData: FlBorderData(show: false),
                  titlesData: const FlTitlesData(show: true, leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false))),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              Icon(icon, color: color),
              const SizedBox(height: 8),
              Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }
}

