import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void | Promise<void>;
  placeholder: string;
  disabled?: boolean;
  onAttachmentPress?: () => void;
};

export function Composer({
  value,
  onChangeText,
  onSend,
  placeholder,
  disabled,
  onAttachmentPress,
}: Props) {
  const canSend =
    value.trim().length > 0 &&
    !disabled;

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.icon}
        onPress={onAttachmentPress}
        accessibilityLabel="Add attachment"
      >
        <Text style={styles.iconText}>＋</Text>
      </Pressable>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.34)"
        multiline
        style={styles.input}
      />

      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={[
          styles.send,
          !canSend && styles.sendDisabled,
        ]}
      >
        <Text style={styles.sendText}>
          ➤
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 8,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor:
      'rgba(255,255,255,0.08)',
    backgroundColor:
      'rgba(10,11,14,0.80)',
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor:
      'rgba(255,255,255,0.10)',
  },
  iconText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 19,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 38,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor:
      'rgba(255,255,255,0.10)',
    backgroundColor:
      'rgba(255,255,255,0.045)',
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(245,166,35,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor:
      'rgba(245,166,35,0.45)',
  },
  sendDisabled: {
    opacity: 0.35,
  },
  sendText: {
    color: 'rgba(245,166,35,0.95)',
    fontSize: 17,
  },
});
