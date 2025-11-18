import React, { useState, useEffect } from "react";
import { useNavigation } from "expo-router";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Image, Linking
} from "react-native";
import { loadSelectedStudent } from "../../../../utils/storage";
import { useLocalSearchParams } from "expo-router";
//Import the required JSON data
import skillsKnowledge from '../../../../assets/data/Skills and Knowledge years 3-10.json';
import curriculumGames from '../../../../assets/data/curriculum_games.json';
import disciplineVideos from '../../../../assets/data/discipline_videos.json';

// Core type definition
type RequiredSkillsKnowledge = {
  discipline: string;
  skills: string[];
  knowledge_nodes: string[];
};

type Career = {
  id: string;
  title: string;
  discipline: string[];
  category: string;
  description: string;
  connections: any[];
  required_skills_knowledge: RequiredSkillsKnowledge[];
  progression_path?: Array<{
    year_range: string;
    recommended_games?: string[];
    recommended_videos?: string[];
  }>;
};

type Student = {
  user_id: string;
  year: number;
  skills_levels: Record<string, number>;
  knowledge_progress: {
    node: string;
    level: number;
  }[];
  career_interests?: string[];
};

type MissingSkill = {
  name: string;
  current: number;
  target: number;
  delta: number;
};

type MissingKnowledge = {
  code: string;
  current: number;
  target: number;
  delta: number;
  bestYear: number;
  bestLevel: number;
  discipline?: string;
};

// Game and video type definition (complete fields)
type Game = {
  id: string;
  title: string;
  description?: string;
  discipline: string;
  difficulty: string;
  year: number;
  code: string;
  node_id: string;
  estimated_duration_sec: number;
  core_mechanics: string[];
  progress_effects: {
    skills: Array<{
      strand: string;
      level_increment: number;
      cap: number;
    }>;
    knowledge: {
      node: string;
      level_increment: number;
      cap: number;
    };
  };
  thumbnail?: string;
  other_fields?: any;
};

type Video = {
  id: string;
  title: string;
  description?: string;
  discipline: string;
  career_id: string;
  career_title: string;
  duration_sec: number;
  topic_style: string;
  video_url: string;
  thumbnail_url: string;
  tags: string[];
  other_fields?: any;
};

// Modal box content type
type ModalContentType = 'GAME' | 'VIDEO' | 'SKILL' | 'KNOWLEDGE';
type ModalContent = {
  type: ModalContentType;
  data: Game | Video | MissingSkill | MissingKnowledge;
};

// Constant definition
const SKILL_MAP: Record<string, string> = {
  "Questioning & Predicting": "QP",
  "Planning & Conducting": "PC",
  "Processing & Analysing Data": "PAD",
  Evaluating: "EVAL",
  Communicating: "COMM",
};
const TARGET_SKILL_LEVEL = 8;
const TARGET_KNOWLEDGE_LEVEL = 3;
const PLACEHOLDER_THUMBNAIL = "https://example.org/thumbnails/default.jpg";

// Tool function: format seconds as minutes and seconds.
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

// Tool function: get the full name of skills
const getSkillFullName = (strand: string): string => {
  const reverseMap = Object.entries(SKILL_MAP).find(([name, code]) => code === strand);
  return reverseMap ? reverseMap[0] : strand;
};

const getKnowledgeDiscipline = (code: string): string => {
  const matchedItem = skillsKnowledge.disciplines.find(item => item.id === code);
  if (matchedItem) return matchedItem.discipline;

  const shortCode = code.split('.').pop() || code;
  const matchedByShortCode = skillsKnowledge.disciplines.find(item =>
    item.id.split('.').pop() === shortCode
  );

  return matchedByShortCode?.discipline || 'Unknown Discipline';
};

// Get game details according to ID
const getGameById = (gameId: string): Game | null => {
  return curriculumGames.games?.find(game => game.id === gameId) || null;
};

// Get video details according to ID
const getVideoById = (videoId: string): Video | null => {
  return disciplineVideos.videos?.find(video => video.id === videoId) || null;
};

const extractCode = (fullNode: string) => {
  const parts = fullNode.split(".");
  return parts[parts.length - 1];
};

const parseYearAndUnit = (code: string) => {
  const m = code.match(/AC9S(\d{1,2})U(\d{2})/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), unit: m[2] };
};

// Calculate missing items
const computeMissingItems = (career: Career, student: Student) => {
  const rskList = career.required_skills_knowledge || [];
  const missingSkills: MissingSkill[] = [];
  const missingKnowledge: MissingKnowledge[] = [];

  // Calculating missing skills
  const requiredSkills = new Set<string>();
  rskList.forEach((rsk) => rsk.skills.forEach((skill) => requiredSkills.add(skill)));

  requiredSkills.forEach((skillName) => {
    const code = SKILL_MAP[skillName];
    if (!code) return;
    const current = student.skills_levels[code] ?? 0;
    const target = TARGET_SKILL_LEVEL;
    const delta = Math.max(0, target - current);
    if (delta > 0) {
      missingSkills.push({ name: skillName, current, target, delta });
    }
  });

  // Calculation of missing knowledge
  const studentUnits: Record<string, { bestYear: number; bestLevel: number }> = {};
  const exactKnowledgeMap: Record<string, number> = {};

  student.knowledge_progress.forEach((kp) => {
    const shortCode = extractCode(kp.node);
    const parsed = parseYearAndUnit(shortCode);
    if (!parsed) return;

    if (!exactKnowledgeMap[shortCode] || kp.level > exactKnowledgeMap[shortCode]) {
      exactKnowledgeMap[shortCode] = kp.level;
    }

    if (!studentUnits[parsed.unit] || parsed.year > studentUnits[parsed.unit].bestYear) {
      studentUnits[parsed.unit] = { bestYear: parsed.year, bestLevel: kp.level };
    } else if (parsed.year === studentUnits[parsed.unit].bestYear && kp.level > studentUnits[parsed.unit].bestLevel) {
      studentUnits[parsed.unit].bestLevel = kp.level;
    }
  });

  rskList.forEach((rsk) => {
    rsk.knowledge_nodes.forEach((code) => {
      const req = parseYearAndUnit(code);
      if (!req) return;

      const unitData = studentUnits[req.unit] || { bestYear: 0, bestLevel: 0 };
      const currentExactLevel = exactKnowledgeMap[code] ?? 0;
      const target = TARGET_KNOWLEDGE_LEVEL;
      const delta = Math.max(0, target - currentExactLevel);
      const discipline = getKnowledgeDiscipline(code);

      let isMissing = false;
      if (unitData.bestYear === 0) isMissing = true;
      else if (unitData.bestYear < req.year) isMissing = true;
      else if (unitData.bestYear === req.year && currentExactLevel < target) isMissing = true;

      if (isMissing) {
        missingKnowledge.push({
          code,
          current: currentExactLevel,
          target,
          delta,
          bestYear: unitData.bestYear,
          bestLevel: unitData.bestLevel,
          discipline: discipline
        });
      }
    });
  });

  return { missingSkills, missingKnowledge };
};

const ScrollableSteps = () => {
  const navigation = useNavigation();
  const { careersData } = useLocalSearchParams<{ careersData?: string }>();

  // Analyze career data
  const career = careersData
    ? (JSON.parse(careersData) as Career)
    : ({} as Career);

  const [student, setStudent] = useState<Student | null>(null);
  const [missingSkills, setMissingSkills] = useState<MissingSkill[]>([]);
  const [missingKnowledge, setMissingKnowledge] = useState<MissingKnowledge[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const s = await loadSelectedStudent();
        if (s && career.id) {
          setStudent(s);
          const { missingSkills, missingKnowledge } = computeMissingItems(career, s);
          setMissingSkills(missingSkills);
          setMissingKnowledge(missingKnowledge);
        }
      } catch (e) {
        console.error("Error loading student data", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [career.id]);

  // Get progress style
  const getProgressStyles = (current: number, target: number) => {
    const progress = (current / target) * 100;
    let color = "#ff9800"; // on going
    if (progress === 0) color = "#ccc"; // Not started
    if (progress === 100) color = "#4caf50"; // completed
    return { progress, color };
  };

  // Click on processing skills/knowledge items.
  const handleItemPress = (item: MissingSkill | MissingKnowledge) => {
    const type = "name" in item ? 'SKILL' as const : 'KNOWLEDGE' as const;
    setModalContent({ type, data: item });
    setModalVisible(true);
  };

  // Handle game clicks
  const handleGamePress = (gameId: string) => {
    const game = getGameById(gameId);
    if (game) {
      setModalContent({ type: 'GAME', data: game });
      setModalVisible(true);
    } else {
      Alert.alert("Not Found", `Game ${gameId} details not available`);
    }
  };

  // Handle video clicks
  const handleVideoPress = (videoId: string) => {
    const video = getVideoById(videoId);
    if (video) {
      setModalContent({ type: 'VIDEO', data: video });
      setModalVisible(true);
    } else {
      Alert.alert("Not Found", `Video ${videoId} details not available`);
    }
  };

  // Handle video playback
  const handlePlayVideo = (url: string) => {
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "Could not open video URL");
      }
    });
  };

  // Processing mark complete
  const handleMarkCompleted = () => {
    if (!modalContent || (modalContent.type !== 'SKILL' && modalContent.type !== 'KNOWLEDGE')) return;
    const item = modalContent.data as MissingSkill | MissingKnowledge;

    const displayName = "name" in item
      ? item.name
      : item.discipline || item.code;

    Alert.alert(
      "Mark as Completed",
      `Are you sure you want to mark ${displayName} as completed?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "default",
          onPress: () => {
            setModalVisible(false);
            Alert.alert("Success", `${displayName} marked as completed!`);
          }
        }
      ]
    );
  };

  // Render modal box content
  const renderModalContent = () => {
    if (!modalContent) return null;

    switch (modalContent.type) {
      case 'GAME': {
        const game = modalContent.data as Game;
        return (
          <>
            <Text style={styles.modalTitle}>{game.title}</Text>
            <Text style={styles.modalSubtitle}>Interactive Learning Game</Text>

            {/* game */}
            {/*<Image
              source={{ uri: game.thumbnail || PLACEHOLDER_THUMBNAIL }}
              style={styles.mediaThumbnail}
              resizeMode="cover"
            />*/}

            {/* Core information overview column */}
            <View style={styles.gameInfoBar}>
              <View style={styles.infoBarItem}>
                <Text style={styles.infoBarLabel}>Year</Text>
                <Text style={styles.infoBarValue}>Year {game.year}</Text>
              </View>
              <View style={styles.infoBarItem}>
                <Text style={styles.infoBarLabel}>Duration</Text>
                <Text style={styles.infoBarValue}>{formatDuration(game.estimated_duration_sec)}</Text>
              </View>
              <View style={styles.infoBarItem}>
                <Text style={styles.infoBarLabel}>Difficulty</Text>
                <Text style={[styles.infoBarValue, (styles as any)[`difficulty_${game.difficulty.toLowerCase()}`]]}>
                  {game.difficulty}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              <View style={styles.modalDetails}>
                {/* Basic information */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Basic Information</Text>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Game ID</Text>
                      <Text style={styles.detailValue}>{game.id}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Discipline</Text>
                      <Text style={styles.detailValue}>{game.discipline}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Curriculum Code</Text>
                      <Text style={styles.detailValue}>{game.code}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Node ID</Text>
                      <Text style={styles.detailValue}>{game.node_id}</Text>
                    </View>
                  </View>
                </View>

                {/* Core mechanism */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Core Mechanics</Text>
                  <View style={styles.tagList}>
                    {game.core_mechanics.map((mechanic, idx) => (
                      <View key={idx} style={styles.tagItem}>
                        <Text style={styles.tagText}>{mechanic}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* learning effect */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Learning Progress Effects</Text>

                  <View style={styles.progressEffectSection}>
                    <Text style={styles.progressEffectSubtitle}>Skills Improvement</Text>
                    {game.progress_effects.skills.map((skill, idx) => (
                      <View key={idx} style={styles.skillEffectItem}>
                        <Text style={styles.skillName}>{getSkillFullName(skill.strand)} ({skill.strand})</Text>
                        <Text style={styles.skillDetails}>
                          +{skill.level_increment} level (capped at {skill.cap})
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.progressEffectSection}>
                    <Text style={styles.progressEffectSubtitle}>Knowledge Progression</Text>
                    <View style={styles.knowledgeEffectItem}>
                      <Text style={styles.knowledgeNode}>{game.progress_effects.knowledge.node}</Text>
                      <Text style={styles.knowledgeDetails}>
                        +{game.progress_effects.knowledge.level_increment} level (capped at {game.progress_effects.knowledge.cap})
                      </Text>
                    </View>
                  </View>
                </View>

                {/* describe */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Description</Text>
                  <Text style={styles.modalDescText}>
                    {game.description ||
                     `An engaging interactive game designed to reinforce key concepts in ${game.discipline}. 
                     Players will develop critical thinking skills through ${game.core_mechanics.join(", ")} 
                     while exploring curriculum content aligned with ${game.code}. This game is optimized 
                     for Year ${game.year} students and takes approximately ${formatDuration(game.estimated_duration_sec)} to complete.`}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActionButtons}>
              {/*<TouchableOpacity*/}
              {/*  style={styles.primaryButton}*/}
              {/*  onPress={() => {*/}
              {/*    Alert.alert("Game Launch", "This would launch the game in a full-screen mode.");*/}
              {/*  }}*/}
              {/*>*/}
              {/*  <Text style={styles.primaryButtonText}>Launch Game</Text>*/}
              {/*</TouchableOpacity>*/}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      }

      case 'VIDEO': {
        const video = modalContent.data as Video;
        return (
          <>
            <Text style={styles.modalTitle}>{video.title}</Text>
            <Text style={styles.modalSubtitle}>Educational Video</Text>

            {/*Video thumbnail */}
            {/*<TouchableOpacity*/}
            {/*  style={styles.videoThumbnailContainer}*/}
            {/*  onPress={() => handlePlayVideo(video.video_url)}*/}
            {/*>*/}
            {/*  <Image*/}
            {/*    source={{ uri: video.thumbnail_url || PLACEHOLDER_THUMBNAIL }}*/}
            {/*    style={styles.mediaThumbnail}*/}
            {/*    resizeMode="cover"*/}
            {/*  />*/}
            {/*  <View style={styles.playButtonOverlay}>*/}
            {/*    <View style={styles.playButtonCircle}>*/}
            {/*      <View style={styles.playButtonTriangle} />*/}
            {/*    </View>*/}
            {/*  </View>*/}
            {/*</TouchableOpacity>*/}

            {/* Core information overview column */}
            <View style={styles.videoInfoBar}>
              <View style={styles.infoBarItem}>
                <Text style={styles.infoBarLabel}>Duration</Text>
                <Text style={styles.infoBarValue}>{formatDuration(video.duration_sec)}</Text>
              </View>
              <View style={styles.infoBarItem}>
                <Text style={styles.infoBarLabel}>Style</Text>
                <Text style={styles.infoBarValue}>{video.topic_style}</Text>
              </View>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              <View style={styles.modalDetails}>
                {/* Basic information */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Basic Information</Text>
                  <View style={styles.detailGrid}>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Video ID</Text>
                      <Text style={styles.detailValue}>{video.id}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Discipline</Text>
                      <Text style={styles.detailValue}>{video.discipline}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Career</Text>
                      <Text style={styles.detailValue}>{video.career_title}</Text>
                    </View>
                    <View style={styles.detailGridItem}>
                      <Text style={styles.detailLabel}>Video URL</Text>
                      {/*<TouchableOpacity onPress={() => handlePlayVideo(video.video_url)}>*/}
                      {/*  <Text style={styles.linkText}>Play video</Text>*/}
                      {/*</TouchableOpacity>*/}
                      <Text style={styles.linkText}>{video.video_url}</Text>
                    </View>
                  </View>
                </View>

                {/* label */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Related Topics</Text>
                  <View style={styles.tagList}>
                    {video.tags.map((tag, idx) => (
                      <View key={idx} style={styles.tagItem}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* describe */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Description</Text>
                  <Text style={styles.modalDescText}>
                    {video.description ||
                     `A ${video.topic_style.toLowerCase()} video exploring ${video.discipline} concepts 
                     relevant to ${video.career_title}s. This ${formatDuration(video.duration_sec)} video 
                     covers key topics including ${video.tags.join(", ")}.`}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActionButtons}>
              {/*<TouchableOpacity*/}
              {/*  style={styles.primaryButton}*/}
              {/*  onPress={() => handlePlayVideo(video.video_url)}*/}
              {/*>*/}
              {/*  <Text style={styles.primaryButtonText}>Play Video</Text>*/}
              {/*</TouchableOpacity>*/}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      }

      case 'SKILL': {
        const skill = modalContent.data as MissingSkill;
        return (
          <>
            <Text style={styles.modalTitle}>{skill.name}</Text>
            <Text style={styles.modalSubtitle}>Skill Details</Text>

            <View style={styles.modalDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Level:</Text>
                <Text style={styles.detailValue}>{skill.current}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Target Level:</Text>
                <Text style={styles.detailValue}>{skill.target}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Need to Improve:</Text>
                <Text style={styles.detailValue}>+{skill.delta}</Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              {/*<TouchableOpacity
                style={styles.completeButton}
                onPress={handleMarkCompleted}
              >
                <Text style={styles.completeButtonText}>Mark as Completed</Text>
              </TouchableOpacity>*/}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      }

      case 'KNOWLEDGE': {
        const knowledge = modalContent.data as MissingKnowledge;
        return (
          <>
            <Text style={styles.modalTitle}>
              {knowledge.discipline || knowledge.code}
            </Text>
            <Text style={styles.modalSubtitle}>Knowledge Details</Text>

            <View style={styles.modalDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Level:</Text>
                <Text style={styles.detailValue}>{knowledge.current}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Target Level:</Text>
                <Text style={styles.detailValue}>{knowledge.target}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Need to Improve:</Text>
                <Text style={styles.detailValue}>+{knowledge.delta}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Discipline:</Text>
                <Text style={styles.detailValue}>
                  {knowledge.discipline || 'Unknown Discipline'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Code:</Text>
                <Text style={styles.detailValue}>{knowledge.code}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Best Year:</Text>
                <Text style={styles.detailValue}>
                  {knowledge.bestYear > 0 ? `S${knowledge.bestYear}` : "Not started"}
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
               {/*<TouchableOpacity
                style={styles.completeButton}
                onPress={handleMarkCompleted}
              >
                <Text style={styles.completeButtonText}>Mark as Completed</Text>
              </TouchableOpacity>*/}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </>
        );
      }

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading progress data...</Text>
      </View>
    );
  }

  if (!career.id) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid career data</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Return to previous page</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top return column */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{career.title} - Progress Tracker</Text>
      </View>

      {/* Professional basic information card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Category</Text>
        <Text style={styles.infoValue}>{career.category}</Text>
        <Text style={styles.infoLabel}>Disciplines</Text>
        <Text style={styles.infoValue}>{career.discipline.join(", ")}</Text>
      </View>

      <ScrollView style={styles.stepsScrollView}>
        {/* Missing skills list */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Missing Skills (Target Level: {TARGET_SKILL_LEVEL})</Text>
          {missingSkills.length === 0 ? (
            <Text style={styles.emptyText}>No missing skills! All required skills are up to target.</Text>
          ) : (
            <View style={styles.listContainer}>
              {missingSkills.map((skill, index) => {
                const { progress, color } = getProgressStyles(skill.current, skill.target);
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.listCard}
                    onPress={() => handleItemPress(skill)}
                  >
                    <View style={styles.listCardHeader}>
                      <Text style={styles.listCardTitle}>{skill.name}</Text>
                      <Text style={styles.listCardBadge}>
                        +{skill.delta} needed
                      </Text>
                    </View>
                    <Text style={styles.listCardSubtitle}>
                      Current: {skill.current} / Target: {skill.target}
                    </Text>
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: color }]} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Missing knowledge list */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Missing Knowledge (Target Level: {TARGET_KNOWLEDGE_LEVEL})</Text>
          {missingKnowledge.length === 0 ? (
            <Text style={styles.emptyText}>No missing knowledge! All required units are covered.</Text>
          ) : (
            <View style={styles.listContainer}>
              {missingKnowledge.map((knowledge, index) => {
                const { progress, color } = getProgressStyles(knowledge.current, knowledge.target);
                // Show the subject name first, otherwise show the original code.
                const displayName = knowledge.discipline || knowledge.code;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.listCard}
                    onPress={() => handleItemPress(knowledge)}
                  >
                    <View style={styles.listCardHeader}>
                      <Text style={styles.listCardTitle}>{displayName}</Text>
                      <Text style={styles.listCardBadge}>
                        +{knowledge.delta} needed
                      </Text>
                    </View>
                    <Text style={styles.listCardSubtitle}>
                      Current: {knowledge.current} / Target: {knowledge.target}
                    </Text>
                    {knowledge.bestYear > 0 ? (
                      <Text style={styles.listCardNote}>
                        Highest in unit: S{knowledge.bestYear}, Level {knowledge.bestLevel}
                      </Text>
                    ) : (
                      <Text style={styles.listCardNote}>
                        Discipline unit not started yet
                      </Text>
                    )}
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: color }]} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Career path */}
        {career.progression_path && career.progression_path.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Career Progression Path</Text>
            <View style={styles.pathContainer}>
              {career.progression_path.map((step, index) => (
                <View key={index} style={styles.pathStepCard}>
                  <Text style={styles.pathStepYear}>{step.year_range}</Text>

                  {step.recommended_games && step.recommended_games.length > 0 && (
                    <View>
                      <Text style={styles.pathStepSubtitle}>Recommended Games:</Text>
                      <View style={styles.mediaList}>
                        {step.recommended_games.map((gameId, idx) => (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => handleGamePress(gameId)}
                          >
                            <Text style={styles.mediaItem}>{gameId}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {step.recommended_videos && step.recommended_videos.length > 0 && (
                    <View>
                      <Text style={styles.pathStepSubtitle}>Recommended Videos:</Text>
                      <View style={styles.mediaList}>
                        {step.recommended_videos.map((videoId, idx) => (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => handleVideoPress(videoId)}
                          >
                            <Text style={styles.mediaItem}>{videoId}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Detail modal box*/}
      <View
        style={[styles.modalOverlay, { opacity: modalVisible ? 1 : 0 }]}
        pointerEvents={modalVisible ? 'auto' : 'none'}
      >
        <View style={styles.modalContainer}>
          {renderModalContent()}
        </View>
      </View>
    </View>
  );
};

// style sheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {},
  backText: {
    fontSize: 16,
    color: "#2196f3",
    fontWeight: "500",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#111827",
  },
  infoCard: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
    marginTop: 8,
  },
  infoValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  stepsScrollView: {
    flex: 1,
  },
  sectionContainer: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  listContainer: {
    gap: 12,
  },
  listCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  listCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  listCardBadge: {
    fontSize: 12,
    color: "#fff",
    backgroundColor: "#2196f3",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  listCardSubtitle: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 8,
  },
  listCardNote: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
    marginBottom: 8,
  },
  progressContainer: {
    height: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    padding: 16,
  },
  pathContainer: {
    gap: 16,
  },
  pathStepCard: {
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#4caf50",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  pathStepYear: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  pathStepSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
    marginBottom: 4,
  },
  mediaList: {
    marginBottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mediaItem: {
    fontSize: 13,
    color: "#2196f3",
    textDecorationLine: "underline",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f7f7",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#f7f7f7",
  },
  errorText: {
    fontSize: 16,
    color: "#f44336",
    marginBottom: 20,
    textAlign: "center",
  },
  backBtn: {
    backgroundColor: "#2196f3",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 20,
    //transitionProperty: "opacity",
    //transitionDuration: "200ms",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: "85%",
    width: "100%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    textAlign: "center",
  },
  mediaThumbnail: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 16,
  },
  videoThumbnailContainer: {
    position: "relative",
  },
  playButtonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 8,
  },
  playButtonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderLeftColor: "#2196f3",
    borderTopWidth: 10,
    borderTopColor: "transparent",
    borderBottomWidth: 10,
    borderBottomColor: "transparent",
    marginLeft: 5, // 三角形视觉居中调整
  },
  modalScrollContent: {
    maxHeight: 300,
  },
  modalDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6b7280",
    width: 120,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },
  detailSection: {
    marginVertical: 16,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailGridItem: {
    flex: 1,
    minWidth: 120,
  },
  listItems: {
    paddingLeft: 8,
  },
  listItem: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 4,
  },
  modalDescText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  linkText: {
    color: "#2196f3",
    textDecorationLine: "underline",
    fontSize: 14,
  },
  modalButtons: {
    gap: 12,
    marginTop: 16,
  },
  modalActionButtons: {
    gap: 12,
    marginTop: 16,
    flexDirection: "row",
  },
  primaryButton: {
    backgroundColor: "#2196f3",
    borderRadius: 8,
    paddingVertical: 12,
    flex: 1,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  completeButton: {
    backgroundColor: "#4caf50",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  closeButton: {
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 12,
    flex: 1,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "500",
  },
  // Game information bar style
  gameInfoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  videoInfoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  infoBarItem: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  infoBarLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  infoBarValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  // Difficulty label style
  difficulty_challenge: {
    color: "#d32f2f",
    fontWeight: "500",
  },
  difficulty_medium: {
    color: "#ff9800",
    fontWeight: "500",
  },
  difficulty_easy: {
    color: "#4caf50",
    fontWeight: "500",
  },
  // Label list style
  tagList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagItem: {
    backgroundColor: "#e0f2fe",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 13,
    color: "#0284c7",
  },
  // Learning effect style
  progressEffectSection: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  },
  progressEffectSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  skillEffectItem: {
    marginBottom: 6,
    paddingLeft: 4,
  },
  skillName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#334155",
  },
  skillDetails: {
    fontSize: 12,
    color: "#64748b",
    paddingLeft: 8,
  },
  knowledgeEffectItem: {
    marginBottom: 6,
    paddingLeft: 4,
  },
  knowledgeNode: {
    fontSize: 13,
    fontWeight: "500",
    color: "#334155",
  },
  knowledgeDetails: {
    fontSize: 12,
    color: "#64748b",
    paddingLeft: 8,
  },
});

export default ScrollableSteps;