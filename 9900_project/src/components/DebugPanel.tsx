import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { getMode, setMode } from '../services/recommendationService';

export const DebugPanel: React.FC = () => {
  const [mode, setLocal] = React.useState(getMode());
  const toggle = () => {
    const next = mode === 'rule' ? 'llm' : 'rule';
    setMode(next); setLocal(next);
  };
  return (
    <View style={{ padding: 16, borderTopWidth: 1, borderColor: '#eee' }}>
      <Text style={{ fontWeight: '700' }}>Debug Panel</Text>
      <Text style={{ marginTop: 6 }}>Mode: {mode.toUpperCase()}</Text>
      <Pressable onPress={toggle} style={{ marginTop: 8, backgroundColor: '#111827', padding: 10, borderRadius: 8 }}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>Toggle Rule / LLM</Text>
      </Pressable>
    </View>
  );
};
