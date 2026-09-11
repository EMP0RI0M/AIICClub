import React, { useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  Image,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { colors, radius } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";
import {
  X,
  Search,
  Camera,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Smile,
  Film,
  Gift,
  Send,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

/* =========================================================
   1. ATTACHMENT OPTIONS SHEET
   ========================================================= */

interface MobileAttachmentSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectImage: (asset: { uri: string; name?: string; size?: number; type?: string }) => void;
  onSelectDocument: (doc: { uri: string; name: string; size?: number; mimeType?: string }) => void;
  onOpenGift?: () => void;
}

export function MobileAttachmentSheet({
  visible,
  onClose,
  onSelectImage,
  onSelectDocument,
  onOpenGift,
}: MobileAttachmentSheetProps) {
  const handlePickImage = async () => {
    NativeHaptics.light();
    onClose();
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        onSelectImage({
          uri: asset.uri,
          name: asset.fileName || "image.jpg",
          size: asset.fileSize,
          type: asset.mimeType || "image/jpeg",
        });
      }
    } catch (e) {
      console.warn("[ImagePicker] Error:", e);
    }
  };

  const handleLaunchCamera = async () => {
    NativeHaptics.light();
    onClose();
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;

      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        onSelectImage({
          uri: asset.uri,
          name: asset.fileName || "camera_photo.jpg",
          size: asset.fileSize,
          type: asset.mimeType || "image/jpeg",
        });
      }
    } catch (e) {
      console.warn("[Camera] Error:", e);
    }
  };

  const handlePickDocument = async () => {
    NativeHaptics.light();
    onClose();
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const doc = res.assets[0];
        onSelectDocument({
          uri: doc.uri,
          name: doc.name,
          size: doc.size,
          mimeType: doc.mimeType,
        });
      }
    } catch (e) {
      console.warn("[DocumentPicker] Error:", e);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <View style={styles.sheetContainer}>
          <View style={styles.sheetIndicator} />
          <Text style={styles.sheetTitle}>Add Attachment</Text>

          <View style={styles.optionsList}>
            <Pressable onPress={handlePickImage} style={styles.optionRow}>
              <View style={[styles.optionIconWrap, { backgroundColor: "rgba(212, 160, 23, 0.12)" }]}>
                <ImageIcon size={20} color={colors.accent} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Photo & Video Library</Text>
                <Text style={styles.optionSub}>Share images or screenshots from your device</Text>
              </View>
            </Pressable>

            <Pressable onPress={handleLaunchCamera} style={styles.optionRow}>
              <View style={[styles.optionIconWrap, { backgroundColor: "rgba(74, 222, 128, 0.12)" }]}>
                <Camera size={20} color={colors.live} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Take Photo</Text>
                <Text style={styles.optionSub}>Use camera to capture and send immediately</Text>
              </View>
            </Pressable>

            <Pressable onPress={handlePickDocument} style={styles.optionRow}>
              <View style={[styles.optionIconWrap, { backgroundColor: "rgba(56, 189, 248, 0.12)" }]}>
                <FileText size={20} color={colors.info} />
              </View>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Share Document or File</Text>
                <Text style={styles.optionSub}>Upload PDF, code archive, or data file</Text>
              </View>
            </Pressable>

            {onOpenGift && (
              <Pressable
                onPress={() => {
                  NativeHaptics.light();
                  onClose();
                  onOpenGift();
                }}
                style={styles.optionRow}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: "rgba(236, 72, 153, 0.15)" }]}>
                  <Gift size={20} color="#ec4899" />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Send Gift / Nitro Note</Text>
                  <Text style={styles.optionSub}>Attach custom celebratory reward & personalized message</Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

/* =========================================================
   1.5. GIFT PICKER MODAL (WITH CUSTOM MESSAGE NOTE)
   ========================================================= */

const GIFT_TYPES = [
  { id: "nitro_coffee", name: "Virtual Coffee", emoji: "☕", badge: "+10 XP", desc: "Keep the momentum going!" },
  { id: "nitro_rocket", name: "Speed Boost", emoji: "🚀", badge: "+25 XP", desc: "Accelerate your development!" },
  { id: "nitro_crown", name: "AIIC Crown", emoji: "👑", badge: "+50 XP", desc: "Top contributor recognition" },
  { id: "nitro_pizza", name: "Hackathon Pizza", emoji: "🍕", badge: "+15 XP", desc: "Late night fuel for debugging" },
  { id: "nitro_gem", name: "Diamond Badge", emoji: "💎", badge: "+100 XP", desc: "Distinguished achievement gift" },
];

export function MobileGiftPickerModal({
  visible,
  onClose,
  onSendGift,
}: {
  visible: boolean;
  onClose: () => void;
  onSendGift: (giftData: { type: string; name: string; emoji: string; message?: string }) => void;
}) {
  const [selectedGift, setSelectedGift] = useState(GIFT_TYPES[0]);
  const [note, setNote] = useState("");

  const handleConfirm = () => {
    NativeHaptics.medium();
    onSendGift({
      type: selectedGift.id,
      name: selectedGift.name,
      emoji: selectedGift.emoji,
      message: note.trim() || undefined,
    });
    setNote("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={[styles.sheetContainer, { maxHeight: "85%" }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetIndicator} />
          
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Gift size={20} color="#ec4899" />
              <Text style={styles.sheetTitle}>Send a Gift</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
            Select a reward and add your personal message:
          </Text>

          {/* Gift Type Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginBottom: 16 }}>
            {GIFT_TYPES.map((g) => {
              const isSelected = selectedGift.id === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => {
                    NativeHaptics.selection();
                    setSelectedGift(g);
                  }}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: isSelected ? "#ec4899" : "rgba(255, 255, 255, 0.08)",
                    backgroundColor: isSelected ? "rgba(236, 72, 153, 0.12)" : "rgba(255, 255, 255, 0.03)",
                    alignItems: "center",
                    width: 105,
                  }}
                >
                  <Text style={{ fontSize: 28, marginBottom: 4 }}>{g.emoji}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "bold", color: isSelected ? "#fff" : colors.textSecondary, textAlign: "center" }}>
                    {g.name}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#ec4899", marginTop: 2, fontWeight: "600" }}>{g.badge}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Optional Message Note Field */}
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textPrimary, marginBottom: 6 }}>
            Personal Message (Optional)
          </Text>
          <TextInput
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
              padding: 12,
              color: colors.textPrimary,
              fontSize: 13,
              minHeight: 65,
              textAlignVertical: "top",
              marginBottom: 16,
            }}
            placeholder="Write a custom congratulatory note or message..."
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={200}
          />

          {/* Confirm Button */}
          <Pressable
            onPress={handleConfirm}
            style={{
              backgroundColor: "#ec4899",
              borderRadius: 12,
              paddingVertical: 13,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Send size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
              Send {selectedGift.name} {selectedGift.emoji}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* =========================================================
   2. GIF PICKER MODAL
   ========================================================= */

const GIF_CATEGORIES = ["Trending", "Coding", "Reactions", "AI & Robot", "Celebrate", "Mindblown"];

const CURATED_GIFS: Record<string, Array<{ id: string; url: string; title: string }>> = {
  Trending: [
    { id: "t1", title: "Party", url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif" },
    { id: "t2", title: "Happy", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
    { id: "t3", title: "Thumbs Up", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
    { id: "t4", title: "Celebration", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
    { id: "t5", title: "Dance", url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif" },
    { id: "t6", title: "Cheers", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
  ],
  Coding: [
    { id: "c1", title: "Hacking", url: "https://media.giphy.com/media/YQitE4YNQNahy/giphy.gif" },
    { id: "c2", title: "Typing Fast", url: "https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif" },
    { id: "c3", title: "It Works", url: "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif" },
    { id: "c4", title: "Ship It", url: "https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif" },
    { id: "c5", title: "Developer Debug", url: "https://media.giphy.com/media/LmN8OYiY4m0X85K0Zz/giphy.gif" },
    { id: "c6", title: "Terminal Code", url: "https://media.giphy.com/media/ZVik7pBtu9dNS/giphy.gif" },
  ],
  Reactions: [
    { id: "r1", title: "Shocked", url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif" },
    { id: "r2", title: "Nice", url: "https://media.giphy.com/media/k0hKNuJUq5A7C/giphy.gif" },
    { id: "r3", title: "Thinking", url: "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif" },
    { id: "r4", title: "Popcorn", url: "https://media.giphy.com/media/tFK8urY6KalURUGTta/giphy.gif" },
    { id: "r5", title: "Mind Blown", url: "https://media.giphy.com/media/11ISwbgGL28Ehy/giphy.gif" },
    { id: "r6", title: "Handshake", url: "https://media.giphy.com/media/pHb82xtBPfqEg/giphy.gif" },
  ],
  "AI & Robot": [
    { id: "a1", title: "Robot Dancing", url: "https://media.giphy.com/media/mIZ9rPeMKefm0/giphy.gif" },
    { id: "a2", title: "Matrix", url: "https://media.giphy.com/media/A06UFEx8jxEwU/giphy.gif" },
    { id: "a3", title: "AI Scan", url: "https://media.giphy.com/media/3o7btQ8jDTPGDpgc6I/giphy.gif" },
    { id: "a4", title: "Cyber", url: "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif" },
  ],
  Celebrate: [
    { id: "e1", title: "Confetti", url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif" },
    { id: "e2", title: "Cheers", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
    { id: "e3", title: "Ovation", url: "https://media.giphy.com/media/Zw3oBUuIg231S/giphy.gif" },
    { id: "e4", title: "Victory", url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif" },
  ],
  Mindblown: [
    { id: "m1", title: "Mind Blown", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
    { id: "m2", title: "Galaxy Brain", url: "https://media.giphy.com/media/26xBI73gWquCBBCDe/giphy.gif" },
    { id: "m3", title: "Cosmic", url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
  ],
};

import { fetchGifs } from "../../lib/api";

interface MobileGifModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => void;
}

function GifGridCard({
  item,
  onSelect,
}: {
  item: { id: string; url: string; title: string };
  onSelect: (url: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null; // Gracefully remove broken image so zero black boxes appear!
  }

  return (
    <Pressable
      onPress={() => {
        NativeHaptics.medium();
        onSelect(item.url);
      }}
      style={styles.gifCard}
    >
      {loading && (
        <View style={styles.gifSkeleton}>
          <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.3)" />
        </View>
      )}
      <Image
        source={{ uri: item.url }}
        style={styles.gifImage}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
      />
    </Pressable>
  );
}

export function MobileGifModal({ visible, onClose, onSelectGif }: MobileGifModalProps) {
  const [category, setCategory] = useState("Trending");
  const [search, setSearch] = useState("");
  const [gifs, setGifs] = useState<Array<{ id: string; url: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (queryTerm: string, catTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGifs(queryTerm.trim(), catTerm);
      if (res?.gifs && res.gifs.length > 0) {
        setGifs(res.gifs);
      } else {
        const fallback = CURATED_GIFS[catTerm] || CURATED_GIFS.Trending;
        setGifs(fallback);
      }
    } catch (err: any) {
      console.warn("[MobileGifModal] Load failed:", err?.message);
      const fallback = CURATED_GIFS[catTerm] || CURATED_GIFS.Trending;
      setGifs(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        loadData(search, category);
      }, search.trim() ? 300 : 0);
      return () => clearTimeout(timer);
    }
  }, [visible, category, search]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <Film size={18} color={colors.accent} />
            <Text style={styles.modalTitle}>Choose a GIF</Text>
          </View>
          <Pressable onPress={onClose} style={styles.modalCloseBtn} hitSlop={8}>
            <X size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Compact Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={15} color={colors.textMuted} />
          <TextInput
            placeholder="Search GIFs via Klipy & Giphy..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={styles.modalSearchInput}
            returnKeyType="search"
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")} hitSlop={6}>
              <X size={15} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Compact Horizontal Category Selector */}
        {!search && (
          <View style={styles.categoryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {GIF_CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      NativeHaptics.light();
                      setCategory(cat);
                    }}
                    style={[styles.categoryPill, active && styles.categoryPillActive]}
                  >
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{cat}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* GIF Grid / Loading / Error States */}
        {loading ? (
          <View style={styles.gifStatusWrap}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.gifStatusText}>Fetching animated GIFs...</Text>
          </View>
        ) : error ? (
          <View style={styles.gifStatusWrap}>
            <Text style={styles.gifErrorText}>{error}</Text>
            <Pressable
              onPress={() => loadData(search, category)}
              style={styles.retryBtn}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : gifs.length === 0 ? (
          <View style={styles.gifStatusWrap}>
            <Text style={styles.gifStatusText}>No GIFs found for "{search}"</Text>
          </View>
        ) : (
          <FlatList
            data={gifs}
            keyExtractor={(item, idx) => item.id || String(idx)}
            numColumns={2}
            contentContainerStyle={styles.gifGrid}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <GifGridCard
                item={item}
                onSelect={(url) => {
                  onSelectGif(url);
                  onClose();
                }}
              />
            )}
          />
        )}
      </View>
    </Modal>
  );
}

/* =========================================================
   3. EMOJI PICKER MODAL
   ========================================================= */

const EMOJI_SETS: Array<{ label: string; emojis: string[] }> = [
  {
    label: "🔥 Most Popular Reactions",
    emojis: ["👍", "❤️", "🔥", "🚀", "😂", "🎉", "👀", "🧠", "💯", "👏", "⚡", "🙌", "✨", "😍", "💀", "😭", "🤯", "✅", "❌", "🤝"],
  },
  {
    label: "Smilies & Emotion",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"],
  },
  {
    label: "Hearts & Sparkles",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "✨", "⭐", "🌟", "💫", "💥", "🔥"],
  },
  {
    label: "Hand Gestures & People",
    emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄"],
  },
  {
    label: "Tech, Code, Science & Gaming",
    emojis: ["💻", "🖥️", "⌨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀", "📱", "📲", "📡", "🛰️", "🤖", "🦾", "🦿", "🔬", "🔭", "📡", "💡", "🔦", "⚙️", "🔧", "🔨", "🛠️", "🧰", "⚡", "🔋", "🔌", "🧮", "🧬", "🎮", "🕹️", "👾", "🎲", "🎯", "🏆", "🥇", "🥈", "🥉", "🎖️", "🏅", "👑", "💎"],
  },
  {
    label: "Symbols & Status",
    emojis: ["✅", "❌", "⚠️", "⛔", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "🌐", "💹", "❇️", "✳️", "❎", "💬", "🗨️", "🗯️", "💭", "💤"],
  },
];

interface MobileEmojiModalProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export function MobileEmojiModal({ visible, title = "Emoji Picker", onClose, onSelectEmoji }: MobileEmojiModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <Smile size={18} color={colors.accent} />
            <Text style={styles.modalTitle}>{title}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.modalCloseBtn} hitSlop={8}>
            <X size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {EMOJI_SETS.map((group) => (
            <View key={group.label} style={{ marginBottom: 18 }}>
              <Text style={styles.emojiGroupTitle}>{group.label}</Text>
              <View style={styles.emojiGrid}>
                {group.emojis.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => {
                      NativeHaptics.selection();
                      onSelectEmoji(emoji);
                      onClose();
                    }}
                    style={styles.emojiBtn}
                  >
                    <Text style={styles.emojiGlyph}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#0d0e14",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  sheetIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "bold",
    marginBottom: 16,
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 14,
    gap: 14,
  },
  optionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "#050505",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(10, 10, 12, 0.98)",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "bold",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  categoryContainer: {
    height: 38,
    flexGrow: 0,
    marginBottom: 6,
  },
  categoryScroll: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
  },
  categoryPill: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryPillActive: {
    backgroundColor: "rgba(212, 160, 23, 0.18)",
    borderColor: colors.accent,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: "JetBrainsMono_700Bold",
    color: colors.textMuted,
  },
  categoryTextActive: {
    color: colors.accent,
    fontWeight: "bold",
  },
  gifGrid: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  gifCard: {
    flex: 1,
    height: 130,
    margin: 4,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  gifSkeleton: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  gifImage: {
    width: "100%",
    height: "100%",
  },
  gifStatusWrap: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  gifStatusText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  gifErrorText: {
    fontFamily: "JetBrainsMono_400Regular",
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: "rgba(212, 160, 23, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.35)",
  },
  retryBtnText: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 12,
    color: colors.accent,
  },
  emojiGroupTitle: {
    fontFamily: "JetBrainsMono_700Bold",
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emojiBtn: {
    width: (width - 64) / 7,
    height: (width - 64) / 7,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  emojiGlyph: {
    fontSize: 22,
  },
});
