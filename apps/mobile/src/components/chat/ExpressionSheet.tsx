import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Keyboard,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "../../theme/tokens";
import { NativeHaptics } from "../../lib/haptics";
import {
  X,
  Search,
  Smile,
  Film,
  Sparkles,
  Image as ImageIcon,
  Flame,
  Laugh,
  Layers,
} from "lucide-react-native";
import { fetchExpressions } from "../../lib/api";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

export type ExpressionTab = "gifs" | "stickers" | "memes" | "emoji";

interface ExpressionSheetProps {
  visible: boolean;
  initialTab?: ExpressionTab;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectGif: (gifUrl: string) => void;
  onSelectSticker: (stickerUrl: string, title?: string) => void;
  onSelectMeme: (memeUrl: string, title?: string) => void;
}

const KLIPY_KEY = "8EqiwewCJG3bRCjQFYWDsyVQGQ1JoH8d0O05TOrODLiymNArG3RS2kPvKjRLSdG7";
const KLIPY_BASE = `https://api.klipy.com/api/v1/${KLIPY_KEY}`;

/* =========================================================
   FALLBACK DATASETS & CATEGORIES
   ========================================================= */

const GIF_CATEGORIES = [
  "Trending",
  "Reactions",
  "Coding",
  "AI & Robot",
  "Celebrate",
  "Mindblown",
  "Gaming",
];

const STICKER_CATEGORIES = [
  "Trending",
  "Reactions",
  "Cute",
  "Anime",
  "Gaming",
  "Crypto",
  "Love",
];

const MEME_CATEGORIES = [
  "Trending",
  "Programming",
  "Tech",
  "DMs",
  "Work",
  "Crypto",
  "Classic",
];

const CURATED_GIFS: Record<string, Array<{ id: string; url: string; title: string }>> = {
  Trending: [
    { id: "g_t1", title: "Party Celebration", url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif" },
    { id: "g_t2", title: "Thumbs Up", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
    { id: "g_t3", title: "Cheers", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
    { id: "g_t4", title: "Clapping", url: "https://media.giphy.com/media/nbvFVPiEiJH6Q/giphy.gif" },
    { id: "g_t5", title: "Dance", url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif" },
    { id: "g_t6", title: "Happy", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
  ],
  Coding: [
    { id: "g_c1", title: "Hacking & Terminal", url: "https://media.giphy.com/media/YQitE4YNQNahy/giphy.gif" },
    { id: "g_c2", title: "Typing Fast", url: "https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif" },
    { id: "g_c3", title: "It Works!", url: "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif" },
    { id: "g_c4", title: "Ship It", url: "https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif" },
    { id: "g_c5", title: "Debugging", url: "https://media.giphy.com/media/LmN8OYiY4m0X85K0Zz/giphy.gif" },
    { id: "g_c6", title: "Terminal Code", url: "https://media.giphy.com/media/ZVik7pBtu9dNS/giphy.gif" },
  ],
  Reactions: [
    { id: "g_r1", title: "Shocked", url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif" },
    { id: "g_r2", title: "Thinking", url: "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif" },
    { id: "g_r3", title: "Popcorn", url: "https://media.giphy.com/media/tFK8urY6KalURUGTta/giphy.gif" },
    { id: "g_r4", title: "Mind Blown", url: "https://media.giphy.com/media/11ISwbgGL28Ehy/giphy.gif" },
    { id: "g_r5", title: "Handshake", url: "https://media.giphy.com/media/pHb82xtBPfqEg/giphy.gif" },
    { id: "g_r6", title: "Nice", url: "https://media.giphy.com/media/k0hKNuJUq5A7C/giphy.gif" },
  ],
  "AI & Robot": [
    { id: "g_a1", title: "Robot Dancing", url: "https://media.giphy.com/media/mIZ9rPeMKefm0/giphy.gif" },
    { id: "g_a2", title: "Matrix", url: "https://media.giphy.com/media/A06UFEx8jxEwU/giphy.gif" },
    { id: "g_a3", title: "AI Scan", url: "https://media.giphy.com/media/3o7btQ8jDTPGDpgc6I/giphy.gif" },
    { id: "g_a4", title: "Cyberpunk", url: "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif" },
  ],
  Celebrate: [
    { id: "g_e1", title: "Confetti", url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif" },
    { id: "g_e2", title: "Victory", url: "https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif" },
    { id: "g_e3", title: "Cheers Champagne", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
    { id: "g_e4", title: "Ovation", url: "https://media.giphy.com/media/Zw3oBUuIg231S/giphy.gif" },
  ],
  Mindblown: [
    { id: "g_m1", title: "Mind Blown", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
    { id: "g_m2", title: "Galaxy Brain", url: "https://media.giphy.com/media/26xBI73gWquCBBCDe/giphy.gif" },
    { id: "g_m3", title: "Cosmic Wow", url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
  ],
  Gaming: [
    { id: "g_g1", title: "Level Up", url: "https://media.giphy.com/media/l41Yc9aR8Pj4Yv14I/giphy.gif" },
    { id: "g_g2", title: "Victory Royale", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
    { id: "g_g3", title: "GG", url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif" },
  ],
};

const CURATED_STICKERS: Record<string, Array<{ id: string; url: string; title: string }>> = {
  Trending: [
    { id: "st_1", title: "Pepe Cool", url: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif" },
    { id: "st_2", title: "Sparkle Heart", url: "https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif" },
    { id: "st_3", title: "Cat Vibe", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
    { id: "st_4", title: "Party Parrot", url: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif" },
    { id: "st_5", title: "Fire Flame", url: "https://media.giphy.com/media/26tP4gFBQewkLnMv6/giphy.gif" },
    { id: "st_6", title: "Rocket Blast", url: "https://media.giphy.com/media/mi6DsSSNKDbUY/giphy.gif" },
    { id: "st_7", title: "Doge Wow", url: "https://media.giphy.com/media/oBQZIgNobc7ew/giphy.gif" },
    { id: "st_8", title: "GG Shield", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
  ],
  Reactions: [
    { id: "st_r1", title: "Thumbs Up Sticker", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
    { id: "st_r2", title: "Heart Pop", url: "https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif" },
    { id: "st_r3", title: "Mind Blown Star", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
    { id: "st_r4", title: "Fire Spark", url: "https://media.giphy.com/media/26tP4gFBQewkLnMv6/giphy.gif" },
  ],
  Cute: [
    { id: "st_c1", title: "Happy Cat", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
    { id: "st_c2", title: "Sparkle Doge", url: "https://media.giphy.com/media/oBQZIgNobc7ew/giphy.gif" },
  ],
  Anime: [
    { id: "st_a1", title: "Anime Wow", url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif" },
    { id: "st_a2", title: "Anime Sparkle", url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif" },
  ],
  Gaming: [
    { id: "st_g1", title: "Gaming Crown", url: "https://media.giphy.com/media/mi6DsSSNKDbUY/giphy.gif" },
    { id: "st_g2", title: "Pixel Heart", url: "https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif" },
  ],
  Crypto: [
    { id: "st_cr1", title: "To The Moon", url: "https://media.giphy.com/media/mi6DsSSNKDbUY/giphy.gif" },
    { id: "st_cr2", title: "Diamond Hands", url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif" },
  ],
  Love: [
    { id: "st_l1", title: "Heart Balloon", url: "https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif" },
    { id: "st_l2", title: "Hug", url: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif" },
  ],
};

const CURATED_MEMES: Record<string, Array<{ id: string; url: string; title: string }>> = {
  Trending: [
    { id: "mem_1", title: "Distracted Boyfriend", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" },
    { id: "mem_2", title: "Drake Hotline", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80" },
    { id: "mem_3", title: "Woman Yelling at Cat", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80" },
    { id: "mem_4", title: "Roll Safe Think", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80" },
    { id: "mem_5", title: "Success Kid", url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80" },
    { id: "mem_6", title: "This is Fine", url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80" },
  ],
  Programming: [
    { id: "mem_p1", title: "StackOverflow Copy", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80" },
    { id: "mem_p2", title: "Production Deploy", url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80" },
    { id: "mem_p3", title: "It Works on My Machine", url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80" },
  ],
  Tech: [
    { id: "mem_t1", title: "AI vs Human", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" },
    { id: "mem_t2", title: "Cloud Server", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80" },
  ],
  DMs: [
    { id: "mem_d1", title: "Left on Read", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80" },
  ],
  Work: [
    { id: "mem_w1", title: "Monday Morning", url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80" },
  ],
  Crypto: [
    { id: "mem_c1", title: "HODL Vibes", url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80" },
  ],
  Classic: [
    { id: "mem_cl1", title: "Galaxy Brain", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" },
  ],
};

/* =========================================================
   EMOJI CATEGORIES (UNICODE 15.0 STANDARDS)
   ========================================================= */

interface EmojiEntry {
  char: string;
  name: string;
  keywords?: string[];
}

interface EmojiCategory {
  id: string;
  title: string;
  icon: string;
  emojis: EmojiEntry[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "recent",
    title: "Recently Used",
    icon: "🔥",
    emojis: [
      { char: "👍", name: "thumbs up", keywords: ["like", "approve", "ok", "yes"] },
      { char: "❤️", name: "red heart", keywords: ["love", "heart"] },
      { char: "🔥", name: "fire", keywords: ["hot", "lit", "flame"] },
      { char: "🚀", name: "rocket", keywords: ["launch", "fast", "space", "ship"] },
      { char: "😂", name: "face with tears of joy", keywords: ["laugh", "funny", "cry"] },
      { char: "🎉", name: "party popper", keywords: ["celebrate", "tada", "congrats"] },
      { char: "👀", name: "eyes", keywords: ["look", "see", "watch"] },
      { char: "🧠", name: "brain", keywords: ["smart", "think", "intellect"] },
      { char: "💯", name: "hundred points", keywords: ["score", "perfect", "100"] },
      { char: "👏", name: "clapping hands", keywords: ["applause", "praise"] },
      { char: "⚡", name: "high voltage", keywords: ["lightning", "fast", "energy"] },
      { char: "🙌", name: "raising hands", keywords: ["celebrate", "hooray"] },
      { char: "✨", name: "sparkles", keywords: ["magic", "clean", "shiny"] },
      { char: "😍", name: "smiling face with heart-eyes", keywords: ["love", "crush"] },
      { char: "💀", name: "skull", keywords: ["dead", "skeleton", "dying"] },
      { char: "😭", name: "loudly crying face", keywords: ["sob", "tears", "sad"] },
      { char: "🤯", name: "exploding head", keywords: ["mindblown", "shocked"] },
      { char: "✅", name: "check mark button", keywords: ["done", "correct", "verify"] },
      { char: "❌", name: "cross mark", keywords: ["no", "cancel", "wrong"] },
      { char: "🤝", name: "handshake", keywords: ["deal", "agreement", "partner"] },
    ],
  },
  {
    id: "smileys",
    title: "Smileys & Emotion",
    icon: "😀",
    emojis: [
      { char: "😀", name: "grinning face" },
      { char: "😃", name: "grinning face with big eyes" },
      { char: "😄", name: "grinning face with smiling eyes" },
      { char: "😁", name: "beaming face with smiling eyes" },
      { char: "😆", name: "grinning squinting face" },
      { char: "😅", name: "grinning face with sweat" },
      { char: "🤣", name: "rolling on the floor laughing" },
      { char: "😂", name: "face with tears of joy" },
      { char: "🙂", name: "slightly smiling face" },
      { char: "🙃", name: "upside-down face" },
      { char: "😉", name: "winking face" },
      { char: "😊", name: "smiling face with smiling eyes" },
      { char: "😇", name: "smiling face with halo" },
      { char: "🥰", name: "smiling face with hearts" },
      { char: "😍", name: "heart eyes" },
      { char: "🤩", name: "star-struck" },
      { char: "😘", name: "face blowing a kiss" },
      { char: "😗", name: "kissing face" },
      { char: "😚", name: "kissing face with closed eyes" },
      { char: "😋", name: "face savoring food" },
      { char: "😛", name: "face with tongue" },
      { char: "😜", name: "winking face with tongue" },
      { char: "🤪", name: "zany face" },
      { char: "😝", name: "squinting face with tongue" },
      { char: "🤑", name: "money-mouth face" },
      { char: "🤗", name: "smiling face with open hands" },
      { char: "🤭", name: "face with hand over mouth" },
      { char: "🤫", name: "shushing face" },
      { char: "🤔", name: "thinking face" },
      { char: "🤐", name: "zipper-mouth face" },
      { char: "🤨", name: "face with raised eyebrow" },
      { char: "😐", name: "neutral face" },
      { char: "😑", name: "expressionless face" },
      { char: "😶", name: "face without mouth" },
      { char: "😏", name: "smirking face" },
      { char: "😒", name: "unamused face" },
      { char: "🙄", name: "face with rolling eyes" },
      { char: "😬", name: "grimacing face" },
      { char: "🤥", name: "lying face" },
      { char: "😌", name: "relieved face" },
      { char: "😔", name: "pensive face" },
      { char: "😪", name: "sleepy face" },
      { char: "🤤", name: "drooling face" },
      { char: "😴", name: "sleeping face" },
      { char: "😷", name: "face with medical mask" },
      { char: "🤒", name: "face with thermometer" },
      { char: "🤕", name: "face with head-bandage" },
      { char: "🤢", name: "nauseated face" },
      { char: "🤮", name: "face vomiting" },
      { char: "🤧", name: "sneezing face" },
      { char: "🥵", name: "hot face" },
      { char: "🥶", name: "cold face" },
      { char: "🥴", name: "woozy face" },
      { char: "😵", name: "knocked-out face" },
      { char: "🤯", name: "exploding head" },
      { char: "🤠", name: "cowboy hat face" },
      { char: "🥳", name: "partying face" },
      { char: "🥸", name: "disguised face" },
      { char: "😎", name: "smiling face with sunglasses" },
      { char: "🤓", name: "nerd face" },
      { char: "🧐", name: "face with monocle" },
    ],
  },
  {
    id: "people",
    title: "People & Body",
    icon: "🧑",
    emojis: [
      { char: "👋", name: "waving hand" },
      { char: "🤚", name: "raised back of hand" },
      { char: "🖐️", name: "hand with fingers splayed" },
      { char: "✋", name: "raised hand" },
      { char: "🖖", name: "vulcan salute" },
      { char: "👌", name: "OK hand" },
      { char: "🤌", name: "pinched fingers" },
      { char: "🤏", name: "pinching hand" },
      { char: "✌️", name: "victory hand" },
      { char: "🤞", name: "crossed fingers" },
      { char: "🤟", name: "love-you gesture" },
      { char: "🤘", name: "sign of the horns" },
      { char: "🤙", name: "call me hand" },
      { char: "👈", name: "backhand index pointing left" },
      { char: "👉", name: "backhand index pointing right" },
      { char: "👆", name: "backhand index pointing up" },
      { char: "🖕", name: "middle finger" },
      { char: "👇", name: "backhand index pointing down" },
      { char: "☝️", name: "index pointing up" },
      { char: "👍", name: "thumbs up" },
      { char: "👎", name: "thumbs down" },
      { char: "✊", name: "raised fist" },
      { char: "👊", name: "oncoming fist" },
      { char: "🤛", name: "left-facing fist" },
      { char: "🤜", name: "right-facing fist" },
      { char: "👏", name: "clapping hands" },
      { char: "🙌", name: "raising hands" },
      { char: "👐", name: "open hands" },
      { char: "🤲", name: "palms up together" },
      { char: "🤝", name: "handshake" },
      { char: "🙏", name: "folded hands" },
      { char: "✍️", name: "writing hand" },
      { char: "💪", name: "flexed biceps" },
      { char: "🦾", name: "mechanical arm" },
      { char: "🦿", name: "mechanical leg" },
      { char: "🦵", name: "leg" },
      { char: "🦶", name: "foot" },
      { char: "👂", name: "ear" },
      { char: "🦻", name: "ear with hearing aid" },
      { char: "👃", name: "nose" },
      { char: "🧠", name: "brain" },
      { char: "🫀", name: "anatomical heart" },
      { char: "🫁", name: "lungs" },
      { char: "🦷", name: "tooth" },
      { char: "🦴", name: "bone" },
      { char: "👀", name: "eyes" },
      { char: "👁️", name: "eye" },
      { char: "👅", name: "tongue" },
      { char: "👄", name: "mouth" },
    ],
  },
  {
    id: "animals",
    title: "Animals & Nature",
    icon: "🐶",
    emojis: [
      { char: "🐶", name: "dog face" },
      { char: "🐱", name: "cat face" },
      { char: "🐭", name: "mouse face" },
      { char: "🐹", name: "hamster" },
      { char: "🐰", name: "rabbit face" },
      { char: "🦊", name: "fox" },
      { char: "🐻", name: "bear" },
      { char: "🐼", name: "panda" },
      { char: "🐻‍❄️", name: "polar bear" },
      { char: "🐨", name: "koala" },
      { char: "🐯", name: "tiger face" },
      { char: "🦁", name: "lion" },
      { char: "🐮", name: "cow face" },
      { char: "🐷", name: "pig face" },
      { char: "🐸", name: "frog" },
      { char: "🐵", name: "monkey face" },
      { char: "🙈", name: "see-no-evil monkey" },
      { char: "🙉", name: "hear-no-evil monkey" },
      { char: "🙊", name: "speak-no-evil monkey" },
      { char: "🐒", name: "monkey" },
      { char: "🐔", name: "chicken" },
      { char: "🐧", name: "penguin" },
      { char: "🐦", name: "bird" },
      { char: "🐤", name: "baby chick" },
      { char: "🦆", name: "duck" },
      { char: "🦅", name: "eagle" },
      { char: "🦉", name: "owl" },
      { char: "🦇", name: "bat" },
      { char: "🐺", name: "wolf" },
      { char: "🐗", name: "boar" },
      { char: "🐴", name: "horse face" },
      { char: "🦄", name: "unicorn" },
      { char: "🐝", name: "honeybee" },
      { char: "🐛", name: "bug" },
      { char: "🦋", name: "butterfly" },
      { char: "🐌", name: "snail" },
      { char: "🐞", name: "lady beetle" },
      { char: "🐜", name: "ant" },
      { char: "🦟", name: "mosquito" },
      { char: "🦗", name: "cricket" },
      { char: "🕷️", name: "spider" },
      { char: "🦂", name: "scorpion" },
      { char: "🐢", name: "turtle" },
      { char: "🐍", name: "snake" },
      { char: "🦎", name: "lizard" },
      { char: "🦖", name: "T-Rex" },
      { char: "🦕", name: "sauropod" },
      { char: "🐙", name: "octopus" },
      { char: "🦑", name: "squid" },
      { char: "🦐", name: "shrimp" },
      { char: "🦞", name: "lobster" },
      { char: "🦀", name: "crab" },
      { char: "🐡", name: "blowfish" },
      { char: "🐠", name: "tropical fish" },
      { char: "🐟", name: "fish" },
      { char: "🐬", name: "dolphin" },
      { char: "🐳", name: "spouting whale" },
      { char: "🐋", name: "whale" },
      { char: "🦈", name: "shark" },
      { char: "🦭", name: "seal" },
      { char: "🐊", name: "crocodile" },
      { char: "🐅", name: "tiger" },
      { char: "🐆", name: "leopard" },
      { char: "🦓", name: "zebra" },
      { char: "🦍", name: "gorilla" },
      { char: "🦧", name: "orangutan" },
      { char: "🦣", name: "mammoth" },
      { char: "🐘", name: "elephant" },
      { char: "🦛", name: "hippopotamus" },
      { char: "🦏", name: "rhinoceros" },
      { char: "🐪", name: "camel" },
      { char: "🐫", name: "two-hump camel" },
      { char: "🦒", name: "giraffe" },
      { char: "🦘", name: "kangaroo" },
      { char: "🦬", name: "bison" },
      { char: "🐃", name: "water buffalo" },
      { char: "🐂", name: "ox" },
      { char: "🐄", name: "cow" },
      { char: "🐎", name: "horse" },
      { char: "🐖", name: "pig" },
      { char: "🐏", name: "ram" },
      { char: "🐑", name: "ewe" },
      { char: "🦙", name: "llama" },
      { char: "🐐", name: "goat" },
      { char: "🦌", name: "deer" },
      { char: "🐕", name: "dog" },
      { char: "🐩", name: "poodle" },
      { char: "🦮", name: "guide dog" },
      { char: "🐕‍🦺", name: "service dog" },
      { char: "🐈", name: "cat" },
      { char: "🐈‍⬛", name: "black cat" },
      { char: "🪶", name: "feather" },
      { char: "🐓", name: "rooster" },
      { char: "🦃", name: "turkey" },
      { char: "🦤", name: "dodo" },
      { char: "🦚", name: "peacock" },
      { char: "🦜", name: "parrot" },
      { char: "🦢", name: "swan" },
      { char: "🦩", name: "flamingo" },
      { char: "🕊️", name: "dove" },
      { char: "🐇", name: "rabbit" },
      { char: "🦝", name: "raccoon" },
      { char: "🦨", name: "skunk" },
      { char: "🦡", name: "badger" },
      { char: "🦫", name: "beaver" },
      { char: "🦦", name: "otter" },
      { char: "🦥", name: "sloth" },
      { char: "🐁", name: "mouse" },
      { char: "🐀", name: "rat" },
      { char: "🐿️", name: "chipmunk" },
      { char: "🦔", name: "hedgehog" },
    ],
  },
  {
    id: "food",
    title: "Food & Drink",
    icon: "🍔",
    emojis: [
      { char: "🍏", name: "green apple" },
      { char: "🍎", name: "red apple" },
      { char: "🍐", name: "pear" },
      { char: "🍊", name: "tangerine" },
      { char: "🍋", name: "lemon" },
      { char: "🍌", name: "banana" },
      { char: "🍉", name: "watermelon" },
      { char: "🍇", name: "grapes" },
      { char: "🍓", name: "strawberry" },
      { char: "🫐", name: "blueberries" },
      { char: "🍈", name: "melon" },
      { char: "🍒", name: "cherries" },
      { char: "🍑", name: "peach" },
      { char: "🥭", name: "mango" },
      { char: "🍍", name: "pineapple" },
      { char: "🥥", name: "coconut" },
      { char: "🥝", name: "kiwi fruit" },
      { char: "🍅", name: "tomato" },
      { char: "🥑", name: "avocado" },
      { char: "🥦", name: "broccoli" },
      { char: "🌽", name: "ear of corn" },
      { char: "🌶️", name: "hot pepper" },
      { char: "🫑", name: "bell pepper" },
      { char: "🥒", name: "cucumber" },
      { char: "🥬", name: "leafy green" },
      { char: "🥕", name: "carrot" },
      { char: "🧄", name: "garlic" },
      { char: "🧅", name: "onion" },
      { char: "🥔", name: "potato" },
      { char: "🍠", name: "roasted sweet potato" },
      { char: "🥐", name: "croissant" },
      { char: "🥯", name: "bagel" },
      { char: "🍞", name: "bread" },
      { char: "🥖", name: "baguette bread" },
      { char: "🥨", name: "pretzel" },
      { char: "🧀", name: "cheese wedge" },
      { char: "🥚", name: "egg" },
      { char: "🍳", name: "cooking" },
      { char: "🧈", name: "butter" },
      { char: "🥞", name: "pancakes" },
      { char: "🧇", name: "waffle" },
      { char: "🥓", name: "bacon" },
      { char: "🥩", name: "cut of meat" },
      { char: "🍗", name: "poultry leg" },
      { char: "🍖", name: "meat on bone" },
      { char: "🌭", name: "hot dog" },
      { char: "🍔", name: "hamburger" },
      { char: "🍟", name: "french fries" },
      { char: "🍕", name: "pizza" },
      { char: "🫓", name: "flatbread" },
      { char: "🥪", name: "sandwich" },
      { char: "🥙", name: "stuffed flatbread" },
      { char: "🧆", name: "falafel" },
      { char: "🌮", name: "taco" },
      { char: "🌯", name: "burrito" },
      { char: "🫔", name: "tamale" },
      { char: "🥗", name: "green salad" },
      { char: "🥘", name: "shallow pan of food" },
      { char: "🫕", name: "fondue" },
      { char: "🥫", name: "canned food" },
      { char: "🍝", name: "spaghetti" },
      { char: "🍜", name: "steaming bowl" },
      { char: "🍲", name: "pot of food" },
      { char: "🍛", name: "curry rice" },
      { char: "🍣", name: "sushi" },
      { char: "🍱", name: "bento box" },
      { char: "🥟", name: "dumpling" },
      { char: "🦪", name: "oyster" },
      { char: "🍤", name: "fried shrimp" },
      { char: "🍙", name: "rice ball" },
      { char: "🍚", name: "cooked rice" },
      { char: "🍘", name: "rice cracker" },
      { char: "🍥", name: "fish cake with swirl" },
      { char: "🥠", name: "fortune cookie" },
      { char: "🥮", name: "moon cake" },
      { char: "🍢", name: "oden" },
      { char: "🍡", name: "dango" },
      { char: "🍧", name: "shaved ice" },
      { char: "🍨", name: "ice cream" },
      { char: "🍦", name: "soft ice cream" },
      { char: "🥧", name: "pie" },
      { char: "🧁", name: "cupcake" },
      { char: "🍰", name: "shortcake" },
      { char: "🎂", name: "birthday cake" },
      { char: "🍮", name: "custard" },
      { char: "🍭", name: "lollipop" },
      { char: "🍬", name: "candy" },
      { char: "🍫", name: "chocolate bar" },
      { char: "🍿", name: "popcorn" },
      { char: "🍩", name: "doughnut" },
      { char: "🍪", name: "cookie" },
      { char: "🌰", name: "chestnut" },
      { char: "🥜", name: "peanuts" },
      { char: "🍯", name: "honey pot" },
      { char: "🥛", name: "glass of milk" },
      { char: "🍼", name: "baby bottle" },
      { char: "🫖", name: "teapot" },
      { char: "☕", name: "hot beverage" },
      { char: "🧃", name: "beverage box" },
      { char: "🥤", name: "cup with straw" },
      { char: "🧋", name: "bubble tea" },
      { char: "🍶", name: "sake" },
      { char: "🍺", name: "beer mug" },
      { char: "🍻", name: "clinking beer mugs" },
      { char: "🥂", name: "clinking glasses" },
      { char: "🍷", name: "wine glass" },
      { char: "🥃", name: "tumbler glass" },
      { char: "🍸", name: "cocktail glass" },
      { char: "🍹", name: "tropical drink" },
      { char: "🧉", name: "mate" },
      { char: "🍾", name: "bottle with popping cork" },
      { char: "🧊", name: "ice" },
    ],
  },
  {
    id: "activities",
    title: "Activities",
    icon: "⚽",
    emojis: [
      { char: "⚽", name: "soccer ball" },
      { char: "🏀", name: "basketball" },
      { char: "🏈", name: "american football" },
      { char: "⚾", name: "baseball" },
      { char: "🥎", name: "softball" },
      { char: "🎾", name: "tennis" },
      { char: "🏐", name: "volleyball" },
      { char: "🏉", name: "rugby football" },
      { char: "🥏", name: "flying disc" },
      { char: "🎱", name: "pool 8 ball" },
      { char: "🪀", name: "yo-yo" },
      { char: "🏓", name: "ping pong" },
      { char: "🏸", name: "badminton" },
      { char: "🏒", name: "ice hockey" },
      { char: "🏑", name: "field hockey" },
      { char: "🥍", name: "lacrosse" },
      { char: "🏏", name: "cricket game" },
      { char: "🪃", name: "boomerang" },
      { char: "🥅", name: "goal net" },
      { char: "⛳", name: "flag in hole" },
      { char: "🪁", name: "kite" },
      { char: "🏹", name: "bow and arrow" },
      { char: "🎣", name: "fishing pole" },
      { char: "🤿", name: "diving mask" },
      { char: "🥊", name: "boxing glove" },
      { char: "🥋", name: "martial arts uniform" },
      { char: "🎽", name: "running shirt" },
      { char: "🛹", name: "skateboard" },
      { char: "🛼", name: "roller skate" },
      { char: "🛷", name: "sled" },
      { char: "⛸️", name: "ice skate" },
      { char: "🥌", name: "curling stone" },
      { char: "🎿", name: "skis" },
      { char: "⛷️", name: "skier" },
      { char: "🏂", name: "snowboarder" },
      { char: "🪂", name: "parachute" },
      { char: "🏋️", name: "person lifting weights" },
      { char: "🤼", name: "people wrestling" },
      { char: "🤸", name: "person cartwheeling" },
      { char: "⛹️", name: "person bouncing ball" },
      { char: "🤺", name: "person fencing" },
      { char: "🤾", name: "person playing handball" },
      { char: "🏌️", name: "person golfing" },
      { char: "🏇", name: "horse racing" },
      { char: "🧘", name: "person in lotus position" },
      { char: "🏄", name: "person surfing" },
      { char: "🏊", name: "person swimming" },
      { char: "🤽", name: "person playing water polo" },
      { char: "🚣", name: "person rowing boat" },
      { char: "🧗", name: "person climbing" },
      { char: "🚵", name: "person mountain biking" },
      { char: "🚴", name: "person biking" },
      { char: "🏆", name: "trophy" },
      { char: "🥇", name: "1st place medal" },
      { char: "🥈", name: "2nd place medal" },
      { char: "🥉", name: "3rd place medal" },
      { char: "🏅", name: "sports medal" },
      { char: "🎖️", name: "military medal" },
      { char: "🏵️", name: "rosette" },
      { char: "🎗️", name: "reminder ribbon" },
      { char: "🎫", name: "ticket" },
      { char: "🎟️", name: "admission tickets" },
      { char: "🎪", name: "circus tent" },
      { char: "🤹", name: "person juggling" },
      { char: "🎭", name: "performing arts" },
      { char: "🩰", name: "ballet shoes" },
      { char: "🎨", name: "artist palette" },
      { char: "🎬", name: "clapper board" },
      { char: "🎤", name: "microphone" },
      { char: "🎧", name: "headphone" },
      { char: "🎼", name: "musical score" },
      { char: "🎹", name: "musical keyboard" },
      { char: "🥁", name: "drum" },
      { char: "🪘", name: "long drum" },
      { char: "🎷", name: "saxophone" },
      { char: "🎺", name: "trumpet" },
      { char: "🎸", name: "guitar" },
      { char: "🪕", name: "banjo" },
      { char: "🎻", name: "violin" },
      { char: "🎲", name: "game die" },
      { char: "♟️", name: "chess pawn" },
      { char: "🎯", name: "bullseye" },
      { char: "🎳", name: "bowling" },
      { char: "🎮", name: "video game" },
      { char: "🎰", name: "slot machine" },
      { char: "🧩", name: "puzzle piece" },
    ],
  },
  {
    id: "travel",
    title: "Travel & Places",
    icon: "✈️",
    emojis: [
      { char: "🚗", name: "automobile" },
      { char: "🚕", name: "taxi" },
      { char: "🚙", name: "sport utility vehicle" },
      { char: "🚌", name: "bus" },
      { char: "🚎", name: "trolleybus" },
      { char: "🏎️", name: "racing car" },
      { char: "🚓", name: "police car" },
      { char: "🚑", name: "ambulance" },
      { char: "🚒", name: "fire engine" },
      { char: "🚐", name: "minibus" },
      { char: "🛻", name: "pickup truck" },
      { char: "🚚", name: "delivery truck" },
      { char: "🚛", name: "articulated lorry" },
      { char: "🚜", name: "tractor" },
      { char: "🦯", name: "white cane" },
      { char: "🦽", name: "manual wheelchair" },
      { char: "🦼", name: "motorized wheelchair" },
      { char: "🛴", name: "kick scooter" },
      { char: "🚲", name: "bicycle" },
      { char: "🛵", name: "motor scooter" },
      { char: "🏍️", name: "motorcycle" },
      { char: "🛺", name: "auto rickshaw" },
      { char: "🚨", name: "police car light" },
      { char: "🚔", name: "oncoming police car" },
      { char: "🚍", name: "oncoming bus" },
      { char: "🚘", name: "oncoming automobile" },
      { char: "🚖", name: "oncoming taxi" },
      { char: "🚡", name: "aerial tramway" },
      { char: "🚠", name: "mountain cableway" },
      { char: "🚟", name: "suspension railway" },
      { char: "🚃", name: "railway car" },
      { char: "🚋", name: "tram car" },
      { char: "🚞", name: "mountain railway" },
      { char: "🚝", name: "monorail" },
      { char: "🚄", name: "high-speed train" },
      { char: "🚅", name: "bullet train" },
      { char: "🚈", name: "light rail" },
      { char: "🚂", name: "locomotive" },
      { char: "🚆", name: "train" },
      { char: "🚇", name: "metro" },
      { char: "🚊", name: "tram" },
      { char: "🚉", name: "station" },
      { char: "✈️", name: "airplane" },
      { char: "🛫", name: "airplane departure" },
      { char: "🛬", name: "airplane arrival" },
      { char: "🛩️", name: "small airplane" },
      { char: "💺", name: "seat" },
      { char: "🛰️", name: "satellite" },
      { char: "🚀", name: "rocket" },
      { char: "🛸", name: "flying saucer" },
      { char: "🚁", name: "helicopter" },
      { char: "🛶", name: "canoe" },
      { char: "⛵", name: "sailboat" },
      { char: "🚤", name: "speedboat" },
      { char: "🛥️", name: "motor boat" },
      { char: "🛳️", name: "passenger ship" },
      { char: "⛴️", name: "ferry" },
      { char: "🚢", name: "ship" },
      { char: "⚓", name: "anchor" },
      { char: "🪝", name: "hook" },
      { char: "⛽", name: "fuel pump" },
      { char: "🚧", name: "construction" },
      { char: "🚦", name: "vertical traffic light" },
      { char: "🚥", name: "horizontal traffic light" },
      { char: "🚏", name: "bus stop" },
      { char: "🗺️", name: "world map" },
      { char: "🗿", name: "moai" },
      { char: "🗽", name: "Statue of Liberty" },
      { char: "🗼", name: "Tokyo tower" },
      { char: "🏰", name: "castle" },
      { char: "🏯", name: "Japanese castle" },
      { char: "🏟️", name: "stadium" },
      { char: "🎡", name: "ferris wheel" },
      { char: "🎢", name: "roller coaster" },
      { char: "🎠", name: "carousel horse" },
      { char: "⛲", name: "fountain" },
      { char: "⛱️", name: "umbrella on ground" },
      { char: "🏖️", name: "beach with umbrella" },
      { char: "🏝️", name: "desert island" },
      { char: "🏜️", name: "desert" },
      { char: "🌋", name: "volcano" },
      { char: "⛰️", name: "mountain" },
      { char: "🏔️", name: "snow-capped mountain" },
      { char: "🏕️", name: "camping" },
      { char: "⛺", name: "tent" },
      { char: "🏠", name: "house" },
      { char: "🏡", name: "house with garden" },
      { char: "🏘️", name: "houses" },
      { char: "🏚️", name: "derelict house" },
      { char: "🏗️", name: "building construction" },
      { char: "🏭", name: "factory" },
      { char: "🏢", name: "office building" },
      { char: "🏬", name: "department store" },
      { char: "🏣", name: "Japanese post office" },
      { char: "🏤", name: "post office" },
      { char: "🏥", name: "hospital" },
      { char: "🏦", name: "bank" },
      { char: "🏨", name: "hotel" },
      { char: "🏪", name: "convenience store" },
      { char: "🏫", name: "school" },
      { char: "🏩", name: "love hotel" },
      { char: "💒", name: "wedding" },
      { char: "🏛️", name: "classical building" },
      { char: "⛪", name: "church" },
      { char: "🕌", name: "mosque" },
      { char: "🛕", name: "hindu temple" },
      { char: "🕍", name: "synagogue" },
      { char: "⛩️", name: "shinto shrine" },
      { char: "🕋", name: "kaaba" },
      { char: "🛤️", name: "railway track" },
      { char: "🛣️", name: "motorway" },
      { char: "🗾", name: "map of Japan" },
      { char: "🎑", name: "moon viewing ceremony" },
      { char: "🏞️", name: "national park" },
      { char: "🌅", name: "sunrise" },
      { char: "🌄", name: "sunrise over mountains" },
      { char: "🌠", name: "shooting star" },
      { char: "🎇", name: "sparkler" },
      { char: "🎆", name: "fireworks" },
      { char: "🌇", name: "sunset" },
      { char: "🌆", name: "cityscape at dusk" },
      { char: "🏙️", name: "cityscape" },
      { char: "🌃", name: "night with stars" },
      { char: "🌌", name: "milky way" },
      { char: "🌉", name: "bridge at night" },
      { char: "🌁", name: "foggy" },
    ],
  },
  {
    id: "objects",
    title: "Objects & Tech",
    icon: "💡",
    emojis: [
      { char: "💻", name: "laptop" },
      { char: "🖥️", name: "desktop computer" },
      { char: "⌨️", name: "keyboard" },
      { char: "🖱️", name: "computer mouse" },
      { char: "🖲️", name: "trackball" },
      { char: "💽", name: "computer disk" },
      { char: "💾", name: "floppy disk" },
      { char: "💿", name: "optical disk" },
      { char: "📀", name: "dvd" },
      { char: "📱", name: "mobile phone" },
      { char: "📲", name: "mobile phone with arrow" },
      { char: "☎️", name: "telephone" },
      { char: "📞", name: "telephone receiver" },
      { char: "📟", name: "pager" },
      { char: "📠", name: "fax machine" },
      { char: "🔋", name: "battery" },
      { char: "🔌", name: "electric plug" },
      { char: "💡", name: "light bulb" },
      { char: "🔦", name: "flashlight" },
      { char: "🕯️", name: "candle" },
      { char: "🪔", name: "diya lamp" },
      { char: "🧯", name: "fire extinguisher" },
      { char: "🛢️", name: "oil drum" },
      { char: "💸", name: "money with wings" },
      { char: "💵", name: "dollar banknote" },
      { char: "💴", name: "yen banknote" },
      { char: "💶", name: "euro banknote" },
      { char: "💷", name: "pound banknote" },
      { char: "🪙", name: "coin" },
      { char: "💰", name: "money bag" },
      { char: "💳", name: "credit card" },
      { char: "💎", name: "gem stone" },
      { char: "⚖️", name: "balance scale" },
      { char: "🪜", name: "ladder" },
      { char: "🧰", name: "toolbox" },
      { char: "🪛", name: "screwdriver" },
      { char: "🔧", name: "wrench" },
      { char: "🔨", name: "hammer" },
      { char: "⚒️", name: "hammer and pick" },
      { char: "🛠️", name: "hammer and wrench" },
      { char: "⛏️", name: "pick" },
      { char: "🪚", name: "carpentry saw" },
      { char: "🔩", name: "nut and bolt" },
      { char: "⚙️", name: "gear" },
      { char: "🪤", name: "mouse trap" },
      { char: "🧱", name: "brick" },
      { char: "⛓️", name: "chains" },
      { char: "🧲", name: "magnet" },
      { char: "🔫", name: "water pistol" },
      { char: "💣", name: "bomb" },
      { char: "🧨", name: "firecracker" },
      { char: "🪓", name: "axe" },
      { char: "🔪", name: "kitchen knife" },
      { char: "🗡️", name: "dagger" },
      { char: "⚔️", name: "crossed swords" },
      { char: "🛡️", name: "shield" },
      { char: "🚬", name: "cigarette" },
      { char: "⚰️", name: "coffin" },
      { char: "🪦", name: "headstone" },
      { char: "⚱️", name: "funeral urn" },
      { char: "🏺", name: "amphora" },
      { char: "🔮", name: "crystal ball" },
      { char: "📿", name: "prayer beads" },
      { char: "🧿", name: "nazar amulet" },
      { char: "💈", name: "barber pole" },
      { char: "⚗️", name: "alembic" },
      { char: "🔭", name: "telescope" },
      { char: "🔬", name: "microscope" },
      { char: "🕳️", name: "hole" },
      { char: "🩹", name: "adhesive bandage" },
      { char: "🩺", name: "stethoscope" },
      { char: "💊", name: "pill" },
      { char: "💉", name: "syringe" },
      { char: "🩸", name: "drop of blood" },
      { char: "🧬", name: "dna" },
      { char: "🦠", name: "microbe" },
      { char: "🧫", name: "petri dish" },
      { char: "🧪", name: "test tube" },
      { char: "🌡️", name: "thermometer" },
      { char: "🧹", name: "broom" },
      { char: "🪠", name: "plunger" },
      { char: "🧺", name: "basket" },
      { char: "🧻", name: "roll of paper" },
      { char: "🚽", name: "toilet" },
      { char: "🚰", name: "potable water" },
      { char: "🚿", name: "shower" },
      { char: "🛁", name: "bathtub" },
      { char: "🛀", name: "person taking bath" },
      { char: "🧼", name: "soap" },
      { char: "🪥", name: "toothbrush" },
      { char: "🧽", name: "sponge" },
      { char: "🪣", name: "bucket" },
      { char: "🧴", name: "lotion bottle" },
      { char: "🛎️", name: "bellhop bell" },
      { char: "🔑", name: "key" },
      { char: "🗝️", name: "old key" },
      { char: "🚪", name: "door" },
      { char: "🪑", name: "chair" },
      { char: "🛋️", name: "couch and lamp" },
      { char: "🛏️", name: "bed" },
      { char: "🛌", name: "person in bed" },
      { char: "🧸", name: "teddy bear" },
      { char: "🪆", name: "nesting dolls" },
      { char: "🖼️", name: "framed picture" },
      { char: "🪞", name: "mirror" },
      { char: "🪟", name: "window" },
      { char: "🛍️", name: "shopping bags" },
      { char: "🛒", name: "shopping cart" },
      { char: "🎁", name: "wrapped gift" },
      { char: "🎈", name: "balloon" },
      { char: "🎏", name: "carp streamer" },
      { char: "🎀", name: "ribbon" },
      { char: "🪄", name: "magic wand" },
      { char: "🪅", name: "piñata" },
      { char: "🎊", name: "confetti ball" },
      { char: "🎉", name: "party popper" },
      { char: "🏮", name: "red paper lantern" },
      { char: "🪔", name: "diya lamp" },
      { char: "✉️", name: "envelope" },
      { char: "📩", name: "envelope with arrow" },
      { char: "📨", name: "incoming envelope" },
      { char: "📧", name: "e-mail" },
      { char: "💌", name: "love letter" },
      { char: "📥", name: "inbox tray" },
      { char: "📤", name: "outbox tray" },
      { char: "📦", name: "package" },
      { char: "🏷️", name: "label" },
      { char: "🪧", name: "placard" },
      { char: "📪", name: "closed mailbox with lowered flag" },
      { char: "📫", name: "closed mailbox with raised flag" },
      { char: "📬", name: "open mailbox with raised flag" },
      { char: "📭", name: "open mailbox with lowered flag" },
      { char: "📮", name: "postbox" },
      { char: "📯", name: "postal horn" },
      { char: "📜", name: "scroll" },
      { char: "📃", name: "page with curl" },
      { char: "📄", name: "page facing up" },
      { char: "📑", name: "bookmark tabs" },
      { char: "🧾", name: "receipt" },
      { char: "📊", name: "bar chart" },
      { char: "📈", name: "chart increasing" },
      { char: "📉", name: "chart decreasing" },
      { char: "🗒️", name: "spiral notepad" },
      { char: "🗓️", name: "spiral calendar" },
      { char: "📆", name: "tear-off calendar" },
      { char: "📅", name: "calendar" },
      { char: "📇", name: "card index" },
      { char: "🗃️", name: "card file box" },
      { char: "🗳️", name: "ballot box with ballot" },
      { char: "🗄️", name: "file cabinet" },
      { char: "📋", name: "clipboard" },
      { char: "📁", name: "file folder" },
      { char: "📂", name: "open file folder" },
      { char: "🗂️", name: "card index dividers" },
      { char: "🗞️", name: "rolled-up newspaper" },
      { char: "📰", name: "newspaper" },
      { char: "📓", name: "notebook" },
      { char: "📕", name: "closed book" },
      { char: "📗", name: "green book" },
      { char: "📘", name: "blue book" },
      { char: "📙", name: "orange book" },
      { char: "📚", name: "books" },
      { char: "📖", name: "open book" },
      { char: "🔖", name: "bookmark" },
      { char: "🔗", name: "link" },
      { char: "📎", name: "paperclip" },
      { char: "🖇️", name: "linked paperclips" },
      { char: "📐", name: "triangular ruler" },
      { char: "📏", name: "straight ruler" },
      { char: "🧮", name: "abacus" },
      { char: "📌", name: "pushpin" },
      { char: "📍", name: "round pushpin" },
      { char: "✂️", name: "scissors" },
      { char: "🖊️", name: "pen" },
      { char: "🖋️", name: "fountain pen" },
      { char: "✒️", name: "black nib" },
      { char: "🖌️", name: "paintbrush" },
      { char: "🖍️", name: "crayon" },
      { char: "📝", name: "memo" },
      { char: "✏️", name: "pencil" },
      { char: "🔍", name: "magnifying glass tilted left" },
      { char: "🔎", name: "magnifying glass tilted right" },
      { char: "🔏", name: "locked with pen" },
      { char: "🔐", name: "locked with key" },
      { char: "🔒", name: "locked" },
      { char: "🔓", name: "unlocked" },
    ],
  },
  {
    id: "symbols",
    title: "Symbols",
    icon: "🔣",
    emojis: [
      { char: "❤️", name: "red heart" },
      { char: "🧡", name: "orange heart" },
      { char: "💛", name: "yellow heart" },
      { char: "💚", name: "green heart" },
      { char: "💙", name: "blue heart" },
      { char: "💜", name: "purple heart" },
      { char: "🖤", name: "black heart" },
      { char: "🤍", name: "white heart" },
      { char: "🤎", name: "brown heart" },
      { char: "💔", name: "broken heart" },
      { char: "❣️", name: "heart exclamation" },
      { char: "💕", name: "two hearts" },
      { char: "💞", name: "revolving hearts" },
      { char: "💓", name: "beating heart" },
      { char: "💗", name: "growing heart" },
      { char: "💖", name: "sparkling heart" },
      { char: "💘", name: "heart with arrow" },
      { char: "💝", name: "heart with ribbon" },
      { char: "💟", name: "heart decoration" },
      { char: "☮️", name: "peace symbol" },
      { char: "✝️", name: "latin cross" },
      { char: "☪️", name: "star and crescent" },
      { char: "🕉️", name: "om" },
      { char: "☸️", name: "wheel of dharma" },
      { char: "✡️", name: "star of David" },
      { char: "🔯", name: "dotted six-pointed star" },
      { char: "🕎", name: "menorah" },
      { char: "☯️", name: "yin yang" },
      { char: "☦️", name: "orthodox cross" },
      { char: "🛐", name: "place of worship" },
      { char: "⛎", name: "ophiuchus" },
      { char: "♈", name: "Aries" },
      { char: "♉", name: "Taurus" },
      { char: "♊", name: "Gemini" },
      { char: "♋", name: "Cancer" },
      { char: "♌", name: "Leo" },
      { char: "♍", name: "Virgo" },
      { char: "♎", name: "Libra" },
      { char: "♏", name: "Scorpio" },
      { char: "♐", name: "Sagittarius" },
      { char: "♑", name: "Capricorn" },
      { char: "♒", name: "Aquarius" },
      { char: "♓", name: "Pisces" },
      { char: "🆔", name: "ID button" },
      { char: "⚛️", name: "atom symbol" },
      { char: "🉑", name: "Japanese acceptable button" },
      { char: "☢️", name: "radioactive" },
      { char: "☣️", name: "biohazard" },
      { char: "📴", name: "mobile phone off" },
      { char: "📳", name: "vibration mode" },
      { char: "🈶", name: "Japanese not free of charge button" },
      { char: "🈚", name: "Japanese free of charge button" },
      { char: "🈸", name: "Japanese application button" },
      { char: "🈺", name: "Japanese open for business button" },
      { char: "🈷️", name: "Japanese monthly amount button" },
      { char: "✴️", name: "eight-pointed star" },
      { char: "🆚", name: "VS button" },
      { char: "💮", name: "white flower" },
      { char: "🉐", name: "Japanese bargain button" },
      { char: "㊙️", name: "Japanese secret button" },
      { char: "㊗️", name: "Japanese congratulations button" },
      { char: "🈴", name: "Japanese passing grade button" },
      { char: "🈵", name: "Japanese no vacancy button" },
      { char: "🈹", name: "Japanese discount button" },
      { char: "🈲", name: "Japanese prohibited button" },
      { char: "🅰️", name: "A button (blood type)" },
      { char: "🅱️", name: "B button (blood type)" },
      { char: "🆎", name: "AB button (blood type)" },
      { char: "🆑", name: "CL button" },
      { char: "🅾️", name: "O button (blood type)" },
      { char: "🆘", name: "SOS button" },
      { char: "❌", name: "cross mark" },
      { char: "⭕", name: "hollow red circle" },
      { char: "🛑", name: "stop sign" },
      { char: "⛔", name: "no entry" },
      { char: "📛", name: "name badge" },
      { char: "🚫", name: "prohibited" },
      { char: "💯", name: "hundred points" },
      { char: "💢", name: "anger symbol" },
      { char: "♨️", name: "hot springs" },
      { char: "🚷", name: "no pedestrians" },
      { char: "🚯", name: "no littering" },
      { char: "🚳", name: "no bicycles" },
      { char: "🚱", name: "non-potable water" },
      { char: "🔞", name: "no one under eighteen" },
      { char: "📵", name: "no mobile phones" },
      { char: "🚭", name: "no smoking" },
      { char: "❗", name: "red exclamation mark" },
      { char: "❕", name: "white exclamation mark" },
      { char: "❓", name: "red question mark" },
      { char: "❔", name: "white question mark" },
      { char: "‼️", name: "double exclamation mark" },
      { char: "⁉️", name: "exclamation question mark" },
      { char: "🔅", name: "dim button" },
      { char: "🔆", name: "bright button" },
      { char: "〽️", name: "part alternation mark" },
      { char: "⚠️", name: "warning" },
      { char: "🚸", name: "children crossing" },
      { char: "🔱", name: "trident emblem" },
      { char: "⚜️", name: "fleur-de-lis" },
      { char: "🔰", name: "Japanese symbol for beginner" },
      { char: "♻️", name: "recycling symbol" },
      { char: "✅", name: "check mark button" },
      { char: "🈯", name: "Japanese reserved button" },
      { char: "💹", name: "chart increasing with yen" },
      { char: "❇️", name: "sparkle" },
      { char: "✳️", name: "eight-spoked asterisk" },
      { char: "❎", name: "cross mark button" },
      { char: "🌐", name: "globe with meridians" },
      { char: "💠", name: "diamond with a dot" },
      { char: "Ⓜ️", name: "circled M" },
      { char: "🌀", name: "cyclone" },
      { char: "💤", name: "zzz" },
      { char: "🏧", name: "ATM sign" },
      { char: "🚾", name: "water closet" },
      { char: "♿", name: "wheelchair symbol" },
      { char: "🅿️", name: "P button" },
      { char: "🈳", name: "Japanese vacancy button" },
      { char: "🈂️", name: "Japanese service charge button" },
      { char: "🛂", name: "passport control" },
      { char: "🛃", name: "customs" },
      { char: "🛄", name: "baggage claim" },
      { char: "🛅", name: "left luggage" },
      { char: "🚹", name: "men's room" },
      { char: "🚺", name: "women's room" },
      { char: "🚼", name: "baby symbol" },
      { char: "🚻", name: "restroom" },
      { char: "🚮", name: "litter in bin sign" },
      { char: "🎦", name: "cinema" },
      { char: "📶", name: "antenna bars" },
      { char: "🈁", name: "Japanese here button" },
      { char: "🔣", name: "input symbols" },
      { char: "ℹ️", name: "information" },
      { char: "🔤", name: "input latin letters" },
      { char: "🔡", name: "input latin lowercase" },
      { char: "🔠", name: "input latin uppercase" },
      { char: "🆖", name: "NG button" },
      { char: "🆗", name: "OK button" },
      { char: "🆙", name: "UP! button" },
      { char: "🆒", name: "COOL button" },
      { char: "🆕", name: "NEW button" },
      { char: "🆓", name: "FREE button" },
      { char: "0️⃣", name: "keycap 0" },
      { char: "1️⃣", name: "keycap 1" },
      { char: "2️⃣", name: "keycap 2" },
      { char: "3️⃣", name: "keycap 3" },
      { char: "4️⃣", name: "keycap 4" },
      { char: "5️⃣", name: "keycap 5" },
      { char: "6️⃣", name: "keycap 6" },
      { char: "7️⃣", name: "keycap 7" },
      { char: "8️⃣", name: "keycap 8" },
      { char: "9️⃣", name: "keycap 9" },
      { char: "🔟", name: "keycap 10" },
      { char: "🔢", name: "input numbers" },
      { char: "#️⃣", name: "keycap #" },
      { char: "*️⃣", name: "keycap *" },
      { char: "⏏️", name: "eject button" },
      { char: "▶️", name: "play button" },
      { char: "⏸️", name: "pause button" },
      { char: "⏯️", name: "play or pause button" },
      { char: "⏹️", name: "stop button" },
      { char: "⏺️", name: "record button" },
      { char: "⏭️", name: "next track button" },
      { char: "⏮️", name: "last track button" },
      { char: "⏩", name: "fast-forward button" },
      { char: "⏪", name: "fast reverse button" },
      { char: "⏫", name: "fast up button" },
      { char: "⏬", name: "fast down button" },
      { char: "◀️", name: "reverse button" },
      { char: "🔼", name: "upwards button" },
      { char: "🔽", name: "downwards button" },
      { char: "➡️", name: "right arrow" },
      { char: "⬅️", name: "left arrow" },
      { char: "⬆️", name: "up arrow" },
      { char: "⬇️", name: "down arrow" },
      { char: "↗️", name: "up-right arrow" },
      { char: "↘️", name: "down-right arrow" },
      { char: "↙️", name: "down-left arrow" },
      { char: "↖️", name: "up-left arrow" },
      { char: "↕️", name: "up-down arrow" },
      { char: "↔️", name: "left-right arrow" },
      { char: "🔄", name: "counterclockwise arrows button" },
      { char: "↪️", name: "left arrow curving right" },
      { char: "↩️", name: "right arrow curving left" },
      { char: "⤴️", name: "right arrow curving up" },
      { char: "⤵️", name: "right arrow curving down" },
      { char: "#️⃣", name: "hash keycap" },
      { char: "🔀", name: "shuffle tracks button" },
      { char: "🔁", name: "repeat button" },
      { char: "🔂", name: "repeat single button" },
    ],
  },
  {
    id: "flags",
    title: "Flags",
    icon: "🏁",
    emojis: [
      { char: "🏁", name: "chequered flag" },
      { char: "🚩", name: "triangular flag" },
      { char: "🎌", name: "crossed flags" },
      { char: "🏴", name: "black flag" },
      { char: "🏳️", name: "white flag" },
      { char: "🏳️‍🌈", name: "rainbow flag" },
      { char: "🏳️‍⚧️", name: "transgender flag" },
      { char: "🏴‍☠️", name: "pirate flag" },
      { char: "🇺🇸", name: "flag: United States" },
      { char: "🇬🇧", name: "flag: United Kingdom" },
      { char: "🇨🇦", name: "flag: Canada" },
      { char: "🇦🇺", name: "flag: Australia" },
      { char: "🇩🇪", name: "flag: Germany" },
      { char: "🇫🇷", name: "flag: France" },
      { char: "🇯🇵", name: "flag: Japan" },
      { char: "🇰🇷", name: "flag: South Korea" },
      { char: "🇮🇳", name: "flag: India" },
      { char: "🇧🇷", name: "flag: Brazil" },
      { char: "🇪🇸", name: "flag: Spain" },
      { char: "🇮🇹", name: "flag: Italy" },
      { char: "🇷🇺", name: "flag: Russia" },
      { char: "🇨🇳", name: "flag: China" },
    ],
  },
];

/* =========================================================
   EXPRESSION SHEET MAIN COMPONENT
   ========================================================= */

export function ExpressionSheet({
  visible,
  initialTab = "emoji",
  onClose,
  onSelectEmoji,
  onSelectGif,
  onSelectSticker,
  onSelectMeme,
}: ExpressionSheetProps) {
  const [activeTab, setActiveTab] = useState<ExpressionTab>(initialTab);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Trending");
  const [items, setItems] = useState<Array<{ id: string; url: string; title: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
      setActiveTab(initialTab);
      setSearch("");
      setSelectedCategory("Trending");
    }
  }, [visible, initialTab]);

  // Load KLIPY media for GIFs, Stickers, Memes
  const loadMedia = async (tab: "gifs" | "stickers" | "memes", queryTerm: string, catTerm: string) => {
    setLoading(true);
    setError(null);

    const fallbackDict =
      tab === "stickers"
        ? CURATED_STICKERS
        : tab === "memes"
        ? CURATED_MEMES
        : CURATED_GIFS;

    const fallback = fallbackDict[catTerm] || fallbackDict.Trending || [];

    try {
      // 1. Try backend proxy
      const res = await fetchExpressions(tab, queryTerm.trim(), catTerm);
      const list = res?.items || res?.gifs;
      if (list && list.length > 0) {
        setItems(list);
        setLoading(false);
        return;
      }

      // 2. Direct KLIPY fallback if needed
      const effectiveQuery = queryTerm.trim() || (catTerm !== "Trending" ? catTerm : "");
      const directUrl = effectiveQuery
        ? `${KLIPY_BASE}/${tab}/search?q=${encodeURIComponent(effectiveQuery)}&per_page=24`
        : `${KLIPY_BASE}/${tab}/trending?per_page=24`;

      const directRes = await fetch(directUrl);
      if (directRes.ok) {
        const json = await directRes.json();
        const d = json?.data?.data;
        if (d && Array.isArray(d) && d.length > 0) {
          const mapped = d.map((it: any) => ({
            id: String(it.id),
            title: it.title || "Media",
            url:
              it.file?.hd?.gif?.url ||
              it.file?.hd?.webp?.url ||
              it.file?.hd?.jpg?.url ||
              it.file?.hd?.png?.url ||
              it.file?.sm?.gif?.url ||
              it.file?.sm?.webp?.url ||
              it.file?.sm?.jpg?.url ||
              it.file?.sm?.png?.url ||
              "",
          })).filter((x: any) => !!x.url);

          if (mapped.length > 0) {
            setItems(mapped);
            setLoading(false);
            return;
          }
        }
      }

      setItems(fallback);
    } catch {
      setItems(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (activeTab === "emoji") return;

    const timer = setTimeout(() => {
      loadMedia(activeTab, search, selectedCategory);
    }, search.trim() ? 300 : 0);

    return () => clearTimeout(timer);
  }, [visible, activeTab, search, selectedCategory]);

  // Filtered Emojis
  const filteredEmojiCategories = useMemo(() => {
    if (!search.trim()) return EMOJI_CATEGORIES;
    const q = search.trim().toLowerCase();

    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter(
        (e) =>
          e.char.includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.keywords?.some((kw) => kw.toLowerCase().includes(q))
      ),
    })).filter((cat) => cat.emojis.length > 0);
  }, [search]);

  const categoriesForTab =
    activeTab === "stickers"
      ? STICKER_CATEGORIES
      : activeTab === "memes"
      ? MEME_CATEGORIES
      : GIF_CATEGORIES;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable
          style={styles.sheetContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Obsidian Liquid Glass Gradient Surface */}
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={["rgba(30, 32, 44, 0.96)", "rgba(13, 14, 20, 0.98)"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />

          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Top Header Row with Search & Close */}
          <View style={styles.topHeader}>
            <View style={styles.searchBarWrapper}>
              <Search size={15} color="#8E92A8" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={
                  activeTab === "emoji" ? "Search emojis..." : "Search KLIPY..."
                }
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {!!search && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <X size={14} color="#8E92A8" />
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={() => {
                NativeHaptics.light();
                onClose();
              }}
              style={styles.closeBtn}
              hitSlop={8}
            >
              <X size={17} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Horizontally Scrollable 4 Main Expression Tabs */}
          <View style={styles.mainTabsRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mainTabsScroll}
            >
              {(
                [
                  { key: "gifs", label: "GIFs", icon: Film },
                  { key: "stickers", label: "Stickers", icon: Sparkles },
                  { key: "memes", label: "Memes", icon: Laugh },
                  { key: "emoji", label: "Emoji", icon: Smile },
                ] as const
              ).map((tabItem) => {
                const isActive = activeTab === tabItem.key;
                const IconComp = tabItem.icon;
                return (
                  <Pressable
                    key={`main-tab-${tabItem.key}`}
                    onPress={() => {
                      NativeHaptics.selection();
                      setActiveTab(tabItem.key);
                      setSearch("");
                      setSelectedCategory("Trending");
                    }}
                    style={[
                      styles.mainTabPill,
                      isActive && styles.mainTabPillActive,
                    ]}
                  >
                    <IconComp
                      size={14}
                      color={isActive ? colors.accent : "#8E92A8"}
                    />
                    <Text
                      style={[
                        styles.mainTabText,
                        isActive && styles.mainTabTextActive,
                      ]}
                    >
                      {tabItem.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Sub-Category Pills (for GIFs, Stickers, Memes) */}
          {activeTab !== "emoji" && !search && (
            <View style={styles.subCategoryRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subCategoryScroll}
              >
                {categoriesForTab.map((catName) => {
                  const isCatActive = selectedCategory === catName;
                  return (
                    <Pressable
                      key={`subcat-${activeTab}-${catName}`}
                      onPress={() => {
                        NativeHaptics.light();
                        setSelectedCategory(catName);
                      }}
                      style={[
                        styles.subCatPill,
                        isCatActive && styles.subCatPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.subCatText,
                          isCatActive && styles.subCatTextActive,
                        ]}
                      >
                        {catName}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* CONTENT SECTION */}
          <View style={styles.sheetBody}>
            {activeTab === "emoji" ? (
              /* EMOJI PICKER LIST */
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.emojiListContent}
              >
                {filteredEmojiCategories.map((group, groupIdx) => (
                  <View
                    key={`emoji-group-${group.id}-${groupIdx}`}
                    style={styles.emojiGroupSection}
                  >
                    <Text style={styles.emojiGroupTitle}>
                      {group.icon} {group.title}
                    </Text>
                    <View style={styles.emojiGrid}>
                      {group.emojis.map((emojiEntry, emojiIdx) => (
                        <Pressable
                          key={`emoji-item-${group.id}-${emojiEntry.char}-${emojiIdx}`}
                          onPress={() => {
                            NativeHaptics.selection();
                            onSelectEmoji(emojiEntry.char);
                          }}
                          style={styles.emojiBtn}
                        >
                          <Text style={styles.emojiGlyph}>{emojiEntry.char}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : loading ? (
              /* LOADING STATE */
              <View style={styles.centerStatusWrap}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.statusText}>
                  Loading {activeTab.toUpperCase()} from KLIPY...
                </Text>
              </View>
            ) : error ? (
              /* ERROR STATE */
              <View style={styles.centerStatusWrap}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  onPress={() => loadMedia(activeTab, search, selectedCategory)}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            ) : items.length === 0 ? (
              /* EMPTY STATE */
              <View style={styles.centerStatusWrap}>
                <Text style={styles.statusText}>
                  No {activeTab} found for "{search}"
                </Text>
              </View>
            ) : activeTab === "stickers" ? (
              /* 3-COLUMN STICKERS GRID */
              <FlatList
                data={items}
                keyExtractor={(it, idx) => `sticker-${it.id || idx}`}
                numColumns={3}
                contentContainerStyle={styles.mediaGridContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      NativeHaptics.medium();
                      onSelectSticker(item.url, item.title);
                      onClose();
                    }}
                    style={styles.stickerCard}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={styles.stickerImage}
                      resizeMode="contain"
                    />
                  </Pressable>
                )}
              />
            ) : (
              /* 2-COLUMN RESPONSIVE GIF / MEME GRID */
              <FlatList
                data={items}
                keyExtractor={(it, idx) => `media-${activeTab}-${it.id || idx}`}
                numColumns={2}
                contentContainerStyle={styles.mediaGridContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      NativeHaptics.medium();
                      if (activeTab === "gifs") {
                        onSelectGif(item.url);
                      } else {
                        onSelectMeme(item.url, item.title);
                      }
                      onClose();
                    }}
                    style={styles.mediaCard}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={styles.mediaImage}
                      resizeMode="cover"
                    />
                  </Pressable>
                )}
              />
            )}
          </View>

          {/* Subtle KLIPY Attribution */}
          {activeTab !== "emoji" && (
            <View style={styles.attributionBar}>
              <Text style={styles.attributionText}>powered by klipy</Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* =========================================================
   LIQUID GLASS STYLES
   ========================================================= */

const styles = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    height: 310,
    maxHeight: 330,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 14 : 8,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignSelf: "center",
    marginBottom: 8,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 8,
  },
  searchBarWrapper: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    paddingVertical: 0,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  mainTabsRow: {
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  mainTabsScroll: {
    flexDirection: "row",
    gap: 8,
  },
  mainTabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  mainTabPillActive: {
    backgroundColor: "rgba(212, 160, 23, 0.16)",
    borderColor: "rgba(212, 160, 23, 0.45)",
  },
  mainTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E92A8",
  },
  mainTabTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  subCategoryRow: {
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  subCategoryScroll: {
    flexDirection: "row",
    gap: 6,
  },
  subCatPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  subCatPillActive: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.22)",
  },
  subCatText: {
    fontSize: 11,
    color: "#7E8299",
    fontWeight: "500",
  },
  subCatTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: 12,
  },
  emojiListContent: {
    paddingBottom: 20,
  },
  emojiGroupSection: {
    marginBottom: 16,
  },
  emojiGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  emojiBtn: {
    width: (SCREEN_WIDTH - 56) / 8,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  emojiGlyph: {
    fontSize: 22,
  },
  centerStatusWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 30,
  },
  statusText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 12,
    color: "#FF6666",
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(212, 160, 23, 0.2)",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.accent,
  },
  mediaGridContent: {
    paddingBottom: 16,
    gap: 8,
  },
  mediaCard: {
    flex: 1,
    height: 105,
    margin: 4,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  stickerCard: {
    flex: 1,
    height: 90,
    margin: 4,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  stickerImage: {
    width: "82%",
    height: "82%",
  },
  attributionBar: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 2,
  },
  attributionText: {
    fontSize: 9,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "rgba(255, 255, 255, 0.3)",
    letterSpacing: 0.5,
  },
});
