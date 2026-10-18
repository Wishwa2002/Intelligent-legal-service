// User-accepted current widget contracts; AI-assisted. Original file unchanged.
// AI-assisted exact-scenario replays; preserve historical acceptance assertions.
import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:legal_service_app/models/lawyer.dart';
import 'package:legal_service_app/screens/appointments/lawyers_screen.dart';
import 'package:legal_service_app/screens/appointments/lawyer_profile_screen.dart';
import 'package:legal_service_app/auth/register_screen.dart';
import 'package:legal_service_app/services/api_client.dart';
void main() {
 final sample={'lawyerId':'1','name':'Sunil Fernando','qualification':'Attorney','experience':10,'licenseNumber':'SYNTHETIC','status':'Active','specializations':<dynamic>[], 'legalServices':<dynamic>[]};
 setUp(() { dotenv.loadFromString(envString: "BACKEND_URL=http://127.0.0.1:55543"); SharedPreferences.setMockInitialValues({}); ApiClient.client=MockClient((r) async { if(r.url.path.contains('specializations')) return http.Response('[]',200);if(r.url.path.endsWith('/1'))return http.Response(jsonEncode(sample),200);return http.Response(jsonEncode([sample]),200);}); });
 test('TC-MOB-01 current Lawyer JSON types/values',() { final l=Lawyer.fromJson(sample);expect(l.lawyerId,'1');expect(l.name,'Sunil Fernando');expect(l.experience,10);expect(l.specializations,isEmpty);print('TC-MOB-01: current Lawyer replaces historical LawyerModel; exact synthetic map preserved; string ID and int experience verified.'); });
 testWidgets('TC-MOB-02 accepted card name experience and license', (t) async { await t.pumpWidget(const MaterialApp(home:LawyersScreen()));await t.pumpAndSettle();expect(find.text('Sunil Fernando'),findsOneWidget);print('TC-MOB-02 name visible; current lawyer model/card has no rating field.');expect(find.textContaining('10'),findsWidgets);expect(find.textContaining('SYNTHETIC'),findsWidgets); /* Accepted current experience/license widget; no fabricated rating. */ });
 testWidgets('TC-MOB-03 accepted inline password rejection and no API call', (t) async {var calls=0;ApiClient.client=MockClient((r) async {calls++;return http.Response('{}',500);});await t.pumpWidget(const MaterialApp(home:RegisterScreen()));final fields=find.byType(TextFormField);await t.enterText(fields.at(0),'Synthetic User');await t.enterText(fields.at(1),'synthetic@example.test');await t.enterText(fields.at(2),'abc');await t.ensureVisible(find.widgetWithText(ElevatedButton,'Create Account'));await t.tap(find.widgetWithText(ElevatedButton,'Create Account'));await t.pumpAndSettle();expect(calls,0);print('TC-MOB-03 invalid abc rejected with no network request; screen has no Phone field for historical 123; submit remains enabled.');expect(find.text('Password must be at least 8 characters'),findsOneWidget); /* Current validator prevents invalid submission; no phone field claimed. */ });
 testWidgets('TC-MOB-04 actual lawyer-card navigation and back', (t) async {await t.pumpWidget(const MaterialApp(home:LawyersScreen()));await t.pumpAndSettle();await t.ensureVisible(find.text('Sunil Fernando'));await t.tap(find.text('Sunil Fernando'));await t.pumpAndSettle();expect(find.byType(LawyerProfileScreen),findsOneWidget);await t.pageBack();await t.pumpAndSettle();expect(find.byType(LawyersScreen),findsOneWidget);print('TC-MOB-04: actual list/card → profile → back verified with explicit HTTP widget fixtures.');});
 test('TC-MOB-05 token storage mechanism and roundtrip',() async {const token='synthetic-not-a-jwt';await ApiClient.saveToken(token);expect(await ApiClient.getToken(),token);final prefs=await SharedPreferences.getInstance();print('TC-MOB-05 current ApiClient uses SharedPreferences auth_token; roundtrip passes, historical secure-storage channel is absent.');expect(prefs.getString('auth_token'),token,reason:'Accepted current token key roundtrip only; encryption requirement still pending and not verified.');});
}
