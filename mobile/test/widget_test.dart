import 'package:flutter_test/flutter_test.dart';
import 'package:legal_service_app/main.dart';

void main() {
  testWidgets('App loads smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const LegalServiceApp());
    await tester.pump();
    expect(find.text('Sign In'), findsWidgets);
    expect(find.text('Welcome Back'), findsOneWidget);
  });
}
