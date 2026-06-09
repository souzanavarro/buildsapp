class Delivery {
  final String id;
  final String address;
  final double latitude;
  final double longitude;
  final String status;
  final int sequence;
  final String? notes;

  Delivery({
    required this.id,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.status,
    required this.sequence,
    this.notes,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'destination_address': address,
    'latitude': latitude,
    'longitude': longitude,
    'status': status,
    'sequence': sequence,
    'notes': notes,
  };

  factory Delivery.fromJson(Map<String, dynamic> json) {
    return Delivery(
      id: json['id'].toString(),
      address: json['destination_address'] ?? '',
      latitude: double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0,
      longitude: double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0,
      status: json['status'] ?? 'pending',
      sequence: json['sequence'] ?? 0,
      notes: json['notes'],
    );
  }
}
