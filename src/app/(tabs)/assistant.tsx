import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { chat } from '@/lib/api';
import { introMessage } from '@/lib/explain';
import { useStore } from '@/lib/store';
import { Color, Elevation, Font, Radius, Space } from '@/theme';

interface Msg {
  id: string;
  role: 'ai' | 'me';
  text: string;
}

let msgSeq = 0;
const mkMsg = (role: Msg['role'], text: string): Msg => ({ id: `m${msgSeq++}`, role, text });

const CHIPS = ['Compare all modes', 'Is biking realistic?', 'What about TransJakarta?'];

export default function Assistant() {
  const insets = useSafeAreaInsets();
  const { routes, selectedRouteId, dest } = useStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setMessages([mkMsg('ai', introMessage(routes, selectedRouteId, dest?.name))]);
  }, [routes, selectedRouteId, dest]);

  const scroll = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    setInput('');
    const next: Msg[] = [...messages, mkMsg('me', t)];
    setMessages(next);
    setTyping(true);
    scroll();
    chat(next, { routes, selectedId: selectedRouteId, destName: dest?.name })
      .then((r) => setMessages([...next, mkMsg('ai', r.reply)]))
      .catch(() =>
        setMessages([...next, mkMsg('ai', 'Sorry, I couldn’t answer that one — try rephrasing.')]),
      )
      .finally(() => {
        setTyping(false);
        scroll();
      });
  };

  return (
    <KeyboardAvoidingView style={[styles.fill, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Assistant</Text>
          <Text style={styles.subtitle}>On-device assistant</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.chat} contentContainerStyle={styles.chatContent}>
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubble, m.role === 'ai' ? styles.ai : styles.me]}>
            <Text style={m.role === 'ai' ? styles.aiTxt : styles.meTxt}>{m.text}</Text>
          </View>
        ))}
        {typing ? (
          <View style={[styles.bubble, styles.ai]}>
            <Text style={styles.aiTxt}>…</Text>
          </View>
        ) : null}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsWrap} contentContainerStyle={styles.chips}>
        {CHIPS.map((c) => (
          <Pressable key={c} style={styles.chip} onPress={() => send(c)}>
            <Text style={styles.chipTxt}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: insets.bottom + Space.sm }]}>
        <TextInput
          style={styles.field}
          placeholder="Ask about your trip…"
          placeholderTextColor={Color.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <Pressable style={styles.sendBtn} onPress={() => send(input)}>
          <Feather name="send" size={18} color={Color.accentOn} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Color.surface },
  header: { paddingHorizontal: Space.lg, paddingVertical: Space.md, backgroundColor: Color.bg },
  title: { fontSize: Font.size.lg, fontWeight: Font.weight.semibold, color: Color.fg },
  subtitle: { fontSize: Font.size.xs, color: Color.muted, marginTop: 2 },
  chat: { flex: 1 },
  chatContent: { padding: Space.lg, gap: Space.md },
  bubble: { maxWidth: '84%', paddingHorizontal: Space.lg, paddingVertical: Space.md, borderRadius: Radius.lg },
  ai: { backgroundColor: Color.bg, alignSelf: 'flex-start', borderBottomLeftRadius: Radius.sm, ...Elevation.card },
  me: { backgroundColor: Color.accent, alignSelf: 'flex-end', borderBottomRightRadius: Radius.sm },
  aiTxt: { color: Color.fg, fontSize: Font.size.sm, lineHeight: 20 },
  meTxt: { color: Color.accentOn, fontSize: Font.size.sm, lineHeight: 20 },
  chipsWrap: { flexGrow: 0, backgroundColor: Color.surface },
  chips: { paddingHorizontal: Space.lg, paddingBottom: Space.md, gap: Space.sm },
  chip: { borderWidth: 1, borderColor: Color.border, backgroundColor: Color.bg, borderRadius: Radius.pill, paddingHorizontal: Space.md, paddingVertical: 8 },
  chipTxt: { fontSize: Font.size.xs, fontWeight: Font.weight.semibold, color: Color.fg2 },
  composer: { flexDirection: 'row', gap: Space.sm, paddingHorizontal: Space.lg, paddingTop: Space.md, borderTopWidth: 1, borderTopColor: Color.borderSoft, backgroundColor: Color.bg },
  field: { flex: 1, backgroundColor: Color.surface, borderRadius: Radius.pill, paddingHorizontal: Space.lg, height: 44, color: Color.fg, fontSize: Font.size.sm },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Color.accent, alignItems: 'center', justifyContent: 'center' },
});
