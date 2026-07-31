import React, { createContext, useContext, useState, useEffect } from 'react';
import { sounds } from '../utils/audio';
import { roomManager } from '../utils/multiplayer';
import confetti from 'canvas-confetti';

const GameContext = createContext();

export const AVATARS = [
  { id: 'monkey', name: 'Çılgın Maymun', icon: '🐵', color: '#f59e0b' },
  { id: 'robot', name: 'Cyber Robot', icon: '🤖', color: '#06b6d4' },
  { id: 'cat', name: 'Ninja Kedi', icon: '🐱', color: '#ec4899' },
  { id: 'fox', name: 'Hacker Tilki', icon: '🦊', color: '#f97316' },
  { id: 'alien', name: 'Uzaylı Alien', icon: '👽', color: '#10b981' },
  { id: 'bear', name: 'Gamer Ayı', icon: '🐻', color: '#8b5cf6' }
];

const QUESTION_BANK = [
  { id: 1, question: "Güneş sisteminde kendi etrafında TERSİNE (doğudan batıya) dönen gezegen hangisidir?", options: ["Venüs", "Mars", "Jüpiter", "Neptün"], correct: 0 },
  { id: 2, question: "Osmanlı Devleti'nin yayınlanan İLK resmi gazetesi hangisidir?", options: ["Takvim-i Vekayi", "Ceride-i Havadis", "Tercüman-ı Ahval", "Tasvir-i Ekar"], correct: 0 },
  { id: 3, question: "Dünyanın en derin noktası olan Mariana Çukuru hangi okyanustadır?", options: ["Pasifik (Büyük Okyanus)", "Atlas Okyanusu", "Hint Okyanusu", "Arktik Okyanusu"], correct: 0 },
  { id: 4, question: "Yazılım dünyasında C++ dilinin geliştiricisi ve yaratıcısı kimdir?", options: ["Bjarne Stroustrup", "Dennis Ritchie", "Guido van Rossum", "James Gosling"], correct: 0 },
  { id: 5, question: "Antik Dünyanın Yedi Harikası'ndan günümüze ayakta kalmayı başarmış TEK yapı hangisidir?", options: ["Keops Piramidi", "Babil'in Asma Bahçeleri", "İskenderiye Feneri", "Rodos Heykeli"], correct: 0 },
  { id: 6, isMiniGame: true, type: 'CODE_BREAKER' },
  { id: 7, question: "Nobel Ödülleri'nden Barış Ödülü dışındaki tüm ödüller hangi ülkede verilmektedir?", options: ["İsveç", "Norveç", "İsviçre", "Almanya"], correct: 0 },
  { id: 8, question: "İnsan vücudundaki en uzun ve en güçlü kemik hangisidir?", options: ["Uyluk Kemiği (Femur)", "Kaval Kemiği", "Omurga", "Pazu Kemiği"], correct: 0 },
  { id: 9, isMiniGame: true, type: 'REFLEX_TAP' },
  { id: 10, question: "Optik kırıcılık birimi 'Diyoptri' matematiksel olarak neyin tersidir?", options: ["Odak Uzaklığı (Metre)", "Işık Şiddeti", "Dalga Boyu", "Frekans"], correct: 0 },
  { id: 11, question: "Dünyanın yüzölçümü ve nüfus bakımından EN KÜÇÜK bağımsız ülkesi hangisidir?", options: ["Vatikan", "Monako", "Nauru", "San Marino"], correct: 0 },
  { id: 12, question: "İç organlarımızdan hangisi kendi kendini yenileyebilme (rejenerasyon) yeteneğine sahiptir?", options: ["Karaciğer", "Böbrek", "Akciğer", "Pankreas"], correct: 0 },
  { id: 13, question: "Elektriğin AC (Alternatif Akım) sistemini geliştiren mucit kimdir?", options: ["Nikola Tesla", "Thomas Edison", "Alexander Graham Bell", "Michael Faraday"], correct: 0 },
  { id: 14, question: "Atom bombasının babası olarak bilinen Amerikalı fizikçi kimdir?", options: ["J. Robert Oppenheimer", "Albert Einstein", "Niels Bohr", "Enrico Fermi"], correct: 0 },
  { id: 15, question: "Güneş ışığının Dünya'ya ulaşması yaklaşık ne kadar sürer?", options: ["8 Dakika 20 Saniye", "1 Saniye", "15 Dakika", "1 Saat"], correct: 0 },
  { id: 16, question: "İstiklal Marşı'mız hangi tarihte TBMM tarafından kabul edilmiştir?", options: ["12 Mart 1921", "29 Ekim 1923", "19 Mayıs 1919", "23 Nisan 1920"], correct: 0 },
  { id: 17, question: "Hangi element periyodik cetvelde 'Au' simgesi ile gösterilir?", options: ["Altın", "Gümüş", "Bakır", "Alüminyum"], correct: 0 },
  { id: 18, question: "Dünyanın en yüksek şelalesi olan Angel Şelalesi hangi ülkededir?", options: ["Venezuela", "Brezilya", "Kanada", "ABD"], correct: 0 },
  { id: 19, question: "Bilgisayar biliminde ilk programcı olarak kabul edilen kadın kimdir?", options: ["Ada Lovelace", "Grace Hopper", "Marie Curie", "Katherine Johnson"], correct: 0 },
  { id: 20, question: "Satranç tahtasında toplam kaç siyah ve beyaz kare bulunur?", options: ["64", "32", "81", "100"], correct: 0 }
];

const CARD_TYPES = [
  { id: 'PASS', name: '🔀 BOMBAYI PASLA', desc: 'Bombayı seçtiğin rakibine at!', color: '#f97316' },
  { id: 'REVERSE', name: '🔄 YÖNÜ TERS ÇEVİR', desc: 'Tur yönünü tersine döndür!', color: '#a855f7' },
  { id: 'CUT_WIRE', name: '✂️ KABLO KESTİR', desc: 'Seçtiğin rakibe 1 kablo kestir!', color: '#ef4444' },
  { id: 'SPEED_UP', name: '⚡ ZAMANI HIZLANDIR', desc: 'Ortak bombayı 5sn yap!', color: '#eab308' },
  { id: 'ADD_TIME', name: '⏳ +5 SANİYE EKLE', desc: 'Ortak bombaya +5s ekle!', color: '#10b981' },
  { id: 'SHIELD', name: '🛡️ BOMBA KALKANI', desc: 'Patlamadan 1 defa korun!', color: '#3b82f6' },
  { id: 'RESET_WIRES', name: '🎲 KABLOLARI SIFIRLA', desc: 'Tüm kesik kabloları yenile!', color: '#06b6d4' },
  { id: 'STEAL', name: '🃏 RAKİPTEN KART ÇAL', desc: 'Seçtiğin rakibinden 1 kart çal!', color: '#ec4899' }
];

export function GameProvider({ children }) {
  const [gameState, setGameState] = useState('LOBBY');
  const [activeRoomCode, setActiveRoomCode] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);

  const [turnIndex, setTurnIndex] = useState(0); 
  const [turnDirection, setTurnDirection] = useState(1); 
  const [timeLeft, setTimeLeft] = useState(60);

  // Cihazın kendi sırası mı hesabı (Çoklu oyuncu odasında)
  const isMyTurn = !activeRoomCode || (players[turnIndex] && String(players[turnIndex].id) === String(myPlayerId));

  const [lastPlayedCard, setLastPlayedCard] = useState(null);
  const [wireEffect, setWireEffect] = useState(null);

  const [players, setPlayers] = useState([
    { id: 0, name: 'Çılgın Maymun', avatar: AVATARS[0], lives: 1, score: 0, hand: [], hasShield: false },
    { id: 1, name: 'Cyber Robot', avatar: AVATARS[1], lives: 1, score: 0, hand: [], hasShield: false },
    { id: 2, name: 'Ninja Kedi', avatar: AVATARS[2], lives: 1, score: 0, hand: [], hasShield: false },
    { id: 3, name: 'Hacker Tilki', avatar: AVATARS[3], lives: 1, score: 0, hand: [], hasShield: false }
  ]);

  const [wires, setWires] = useState([
    { id: 1, color: '#ef4444', isCut: false },
    { id: 2, color: '#3b82f6', isCut: false },
    { id: 3, color: '#eab308', isCut: false },
    { id: 4, color: '#22c55e', isCut: false },
    { id: 5, color: '#a855f7', isCut: false }
  ]);

  const [explodingWireId, setExplodingWireId] = useState(1); 
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [usedQuestionIds, setUsedQuestionIds] = useState([]);
  const [logs, setLogs] = useState([]);

  const getRandomCard = (existingHand = []) => {
    const existingIds = existingHand.map(c => c.id);
    let availableTypes = CARD_TYPES.filter(c => !existingIds.includes(c.id));
    if (availableTypes.length === 0) availableTypes = CARD_TYPES;

    const randomIndex = Math.floor(Math.random() * availableTypes.length);
    return { ...availableTypes[randomIndex], uniqueId: Math.random() };
  };

  const startGame = (customPlayerConfigs = [], roomCode = null) => {
    sounds.init();
    setGameState('PLAYING');
    setActiveRoomCode(roomCode);

    setTurnIndex(0);
    setTurnDirection(1);
    setTimeLeft(60);
    setUsedQuestionIds([]);
    setLastPlayedCard(null);
    setWireEffect(null);

    const initialExplodeId = Math.floor(Math.random() * 5) + 1;
    setExplodingWireId(initialExplodeId);
    setWires([
      { id: 1, color: '#ef4444', isCut: false },
      { id: 2, color: '#3b82f6', isCut: false },
      { id: 3, color: '#eab308', isCut: false },
      { id: 4, color: '#22c55e', isCut: false },
      { id: 5, color: '#a855f7', isCut: false }
    ]);

    const defaultNames = ['Çılgın Maymun', 'Cyber Robot', 'Ninja Kedi', 'Hacker Tilki', 'Uzaylı Alien', 'Gamer Ayı'];

    const newPlayers = customPlayerConfigs.map((config, idx) => {
      const card1 = getRandomCard([]);
      const card2 = getRandomCard([card1]);
      return {
        id: config.id || idx,
        name: config.name?.trim() !== '' ? config.name : defaultNames[idx % defaultNames.length],
        avatar: config.avatar || AVATARS[idx % AVATARS.length],
        lives: 1, // Ani Ölüm Ruleti
        score: 0,
        hand: [card1, card2],
        hasShield: false
      };
    });

    setPlayers(newPlayers);
    const firstQ = QUESTION_BANK[0];
    setCurrentQuestion(firstQ);
    setUsedQuestionIds([firstQ.id]);

    addLog(`💥 ANİ ÖLÜM RULETİ BAŞLADI! Yanlış kabloyu kesen anında patlar!`);

    const initialState = {
      turnIndex: 0,
      turnDirection: 1,
      timeLeft: 60,
      players: newPlayers,
      wires: initialWires,
      currentQuestion: firstQ,
      explodingWireId: initialExplodeId,
      gameState: 'PLAYING'
    };

    if (roomCode) {
      roomManager.broadcastInGameState(initialState);
    }

    return initialState;
  };

  const sanitizePlayers = (playerList) => {
    if (!Array.isArray(playerList)) return [];
    return playerList.map((p, idx) => ({
      ...p,
      id: p.id !== undefined ? p.id : idx,
      name: p.name || `Oyuncu ${idx + 1}`,
      avatar: p.avatar || AVATARS[idx % AVATARS.length],
      lives: p.lives !== undefined ? p.lives : 1,
      score: p.score || 0,
      hand: Array.isArray(p.hand) ? p.hand : [getRandomCard([])],
      hasShield: !!p.hasShield
    }));
  };

  // OYUN İÇİ GERÇEK ZAMANLI DİNLEYİCİ (MULTIPLE DEVICES REALTIME SYNC)
  useEffect(() => {
    if (!activeRoomCode) return;

    const unsubscribe = roomManager.subscribe(activeRoomCode, (payload) => {
      if (!payload) return;

      if (payload.type === 'GAME_STATE_UPDATE' && payload.inGameState) {
        const s = payload.inGameState;
        if (s.turnIndex !== undefined) setTurnIndex(s.turnIndex);
        if (s.turnDirection !== undefined) setTurnDirection(s.turnDirection);
        if (s.timeLeft !== undefined) setTimeLeft(s.timeLeft);
        if (s.players) setPlayers(sanitizePlayers(s.players));
        if (s.wires) setWires(s.wires);
        if (s.currentQuestion) setCurrentQuestion(s.currentQuestion);
        if (s.explodingWireId) setExplodingWireId(s.explodingWireId);
        if (s.lastPlayedCard !== undefined) setLastPlayedCard(s.lastPlayedCard);
        if (s.wireEffect !== undefined) setWireEffect(s.wireEffect);
        if (s.gameState) setGameState(s.gameState);
      }
    });

    return () => unsubscribe();
  }, [activeRoomCode]);

  // Oyun durumunu buluta yayınla
  const syncInGameState = (updatedState = {}) => {
    if (!activeRoomCode) return;

    const payload = {
      turnIndex: updatedState.turnIndex !== undefined ? updatedState.turnIndex : turnIndex,
      turnDirection: updatedState.turnDirection !== undefined ? updatedState.turnDirection : turnDirection,
      timeLeft: updatedState.timeLeft !== undefined ? updatedState.timeLeft : timeLeft,
      players: updatedState.players || players,
      wires: updatedState.wires || wires,
      currentQuestion: updatedState.currentQuestion || currentQuestion,
      explodingWireId: updatedState.explodingWireId || explodingWireId,
      lastPlayedCard: updatedState.lastPlayedCard !== undefined ? updatedState.lastPlayedCard : lastPlayedCard,
      wireEffect: updatedState.wireEffect !== undefined ? updatedState.wireEffect : wireEffect,
      gameState: updatedState.gameState || gameState
    };

    roomManager.broadcastInGameState(payload);
  };

  const resetWires = () => {
    const nextExplodeId = Math.floor(Math.random() * 5) + 1;
    const newWires = [
      { id: 1, color: '#ef4444', isCut: false },
      { id: 2, color: '#3b82f6', isCut: false },
      { id: 3, color: '#eab308', isCut: false },
      { id: 4, color: '#22c55e', isCut: false },
      { id: 5, color: '#a855f7', isCut: false }
    ];
    setExplodingWireId(nextExplodeId);
    setWires(newWires);
    return { nextExplodeId, newWires };
  };

  const pickNewQuestion = () => {
    let availableQuestions = QUESTION_BANK.filter(q => !usedQuestionIds.includes(q.id));
    if (availableQuestions.length === 0) {
      availableQuestions = QUESTION_BANK;
      setUsedQuestionIds([]);
    }
    const randomQ = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    setUsedQuestionIds(prev => [...prev, randomQ.id]);
    setCurrentQuestion(randomQ);
    return randomQ;
  };

  const addLog = (msg) => {
    setLogs(prev => [msg, ...prev.slice(0, 3)]);
  };

  // ORTAK BOMBA GERİ SAYIMI
  useEffect(() => {
    let timerId;
    if (gameState === 'PLAYING' && timeLeft > 0) {
      timerId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeOut();
            return 0;
          }
          sounds.playBeep(prev < 10 ? 1000 : 500, 0.04);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [gameState, timeLeft]);

  const handleTimeOut = () => {
    addLog(`⏰ ORTAK SÜRE BİTTİ! Bomba ${players[turnIndex].name}'in elinde patladı!`);
    triggerExplosionForPlayer(turnIndex);
  };

  const passTurn = (targetIdx = null) => {
    const total = players.length;
    let nextIdx = targetIdx !== null ? targetIdx : (turnIndex + turnDirection + total) % total;
    while (players[nextIdx].lives <= 0) {
      nextIdx = (nextIdx + turnDirection + total) % total;
    }
    
    setTurnIndex(nextIdx);
    const nextQ = pickNewQuestion();
    addLog(`👉 SIRA: ${players[nextIdx].name}'TA!`);

    syncInGameState({
      turnIndex: nextIdx,
      currentQuestion: nextQ
    });
  };

  const answerQuestion = (optionIndex) => {
    if (gameState !== 'PLAYING') return;
    if (activeRoomCode && players[turnIndex] && String(players[turnIndex].id) !== String(myPlayerId)) {
      sounds.playBuzzer();
      addLog(`⚠️ SIRA SENDE DEĞİL! (${players[turnIndex]?.name} HAMLE YAPIYOR)`);
      return;
    }

    if (optionIndex === currentQuestion.correct) {
      sounds.playBeep(1200, 0.1);
      const newPlayers = players.map((p, idx) => idx === turnIndex ? { ...p, score: p.score + 10 } : p);
      setPlayers(newPlayers);
      addLog(`✅ ${players[turnIndex].name} doğru bildi! (+10 Puan)`);
      passTurn();
    } else {
      addLog(`❌ Yanlış cevap! Kablo kesiliyor...`);
      cutRandomWire();
    }
  };

  const handleMiniGameResult = (isSuccess) => {
    if (gameState !== 'PLAYING') return;
    if (activeRoomCode && players[turnIndex] && String(players[turnIndex].id) !== String(myPlayerId)) {
      return;
    }

    if (isSuccess) {
      sounds.playBeep(1400, 0.15);
      const newPlayers = players.map((p, idx) => idx === turnIndex ? { ...p, score: p.score + 15 } : p);
      setPlayers(newPlayers);
      addLog(`🎯 MİNİ OYUN BAŞARILI! (+15 Puan)`);
      passTurn();
    } else {
      addLog(`💥 MİNİ OYUN BAŞARISIZ! Kablo kesiliyor...`);
      cutRandomWire();
    }
  };

  const giveCardToPlayer = (playerIdx) => {
    const updated = players.map((p, idx) => {
      if (idx === playerIdx) {
        const newCard = getRandomCard(p.hand);
        return { ...p, hand: [...p.hand, newCard] };
      }
      return p;
    });
    setPlayers(updated);
    return updated;
  };

  const cutRandomWire = (targetPlayerIdx = null) => {
    sounds.playSnip();
    const uncutWires = wires.filter(w => !w.isCut);
    if (uncutWires.length === 0) return;

    const chosenWire = uncutWires[Math.floor(Math.random() * uncutWires.length)];
    const newWires = wires.map(w => w.id === chosenWire.id ? { ...w, isCut: true } : w);
    setWires(newWires);

    const effect = { color: chosenWire.color, isExplosion: chosenWire.id === explodingWireId };
    setWireEffect(effect);
    setTimeout(() => setWireEffect(null), 600);

    const victimIdx = targetPlayerIdx !== null ? targetPlayerIdx : turnIndex;

    if (chosenWire.id === explodingWireId) {
      if (players[victimIdx].hasShield) {
        sounds.playBeep(1500, 0.3);
        addLog(`🛡️ KALKAN KORUDU! ${players[victimIdx].name} kurtuldu!`);
        const newP = players.map((p, idx) => idx === victimIdx ? { ...p, hasShield: false } : p);
        setPlayers(newP);
        const { nextExplodeId, newWires: freshWires } = resetWires();
        setTimeLeft(60);
        passTurn();

        syncInGameState({
          players: newP,
          wires: freshWires,
          explodingWireId: nextExplodeId,
          timeLeft: 60
        });
      } else {
        triggerExplosionForPlayer(victimIdx);
      }
    } else {
      sounds.playBuzzer();
      addLog(`✂️ Güvenli kablo kesildi! Bomba patlamadı.`);
      passTurn();
      syncInGameState({ wires: newWires });
    }
  };

  const triggerExplosionForPlayer = (playerIdx) => {
    sounds.playExplosion();
    const victim = players[playerIdx];
    addLog(`💥 ANİ ÖLÜM! Bomba patladı ve ${victim.name} ELENDİ!`);

    const updatedPlayers = players.map((p, idx) => idx === playerIdx ? { ...p, lives: 0 } : p);
    setPlayers(updatedPlayers);

    const alivePlayers = updatedPlayers.filter(p => p.lives > 0);
    if (alivePlayers.length === 1) {
      setGameState('GAME_OVER');
      confetti({ particleCount: 150, spread: 80 });
      addLog(`🏆 ŞAMPİYON: ${alivePlayers[0].name}! 🎉`);

      syncInGameState({
        players: updatedPlayers,
        gameState: 'GAME_OVER'
      });
    } else {
      const { nextExplodeId, newWires } = resetWires();
      setTimeLeft(60);
      passTurn();

      syncInGameState({
        players: updatedPlayers,
        wires: newWires,
        explodingWireId: nextExplodeId,
        timeLeft: 60
      });
    }
  };

  const playCard = (card, targetPlayer = null) => {
    if (gameState !== 'PLAYING') return;
    if (activeRoomCode && players[turnIndex] && String(players[turnIndex].id) !== String(myPlayerId)) {
      sounds.playBuzzer();
      addLog(`⚠️ SIRA SENDE DEĞİL! (${players[turnIndex]?.name} HAMLE YAPIYOR)`);
      return;
    }
    sounds.playBeep(1000, 0.1);

    const targetName = targetPlayer ? targetPlayer.name : '';
    const lastPlayed = { ...card, player: players[turnIndex].name };
    setLastPlayedCard(lastPlayed);
    setTimeout(() => setLastPlayedCard(null), 800);

    let updatedPlayers = players.map((p, idx) => idx === turnIndex ? { ...p, hand: p.hand.filter(c => c.uniqueId !== card.uniqueId) } : p);
    setPlayers(updatedPlayers);

    switch (card.id) {
      case 'PASS':
        if (targetPlayer) {
          const targetIdx = players.findIndex(p => p.id === targetPlayer.id);
          addLog(`🔀 ${players[turnIndex].name} BOMBAYI ${targetName}'A ATTI!`);
          passTurn(targetIdx);
        } else {
          addLog(`🔀 ${players[turnIndex].name} BOMBAYI PASLADI!`);
          passTurn();
        }
        break;

      case 'REVERSE':
        addLog(`🔄 ${players[turnIndex].name} YÖNÜ TERS ÇEVİRDİ!`);
        const nextDir = turnDirection * -1;
        setTurnDirection(nextDir);
        passTurn();
        break;

      case 'CUT_WIRE':
        if (targetPlayer) {
          const targetIdx = players.findIndex(p => p.id === targetPlayer.id);
          addLog(`✂️ ${players[turnIndex].name}, ${targetName}'A KABLO KESTİRDİ!`);
          cutRandomWire(targetIdx);
        } else {
          addLog(`✂️ ${players[turnIndex].name} KABLO KESTİRDİ!`);
          cutRandomWire();
        }
        break;

      case 'SPEED_UP':
        addLog(`⚡ ${players[turnIndex].name} ORTAK ZAMANI 5 SANİYE YAPTI!`);
        setTimeLeft(5);
        syncInGameState({ timeLeft: 5, lastPlayedCard: lastPlayed });
        break;

      case 'ADD_TIME':
        addLog(`⏳ ${players[turnIndex].name} ORTAK BOMBAYA +5s EKLEDİ!`);
        const newTime = timeLeft + 5;
        setTimeLeft(newTime);
        syncInGameState({ timeLeft: newTime, lastPlayedCard: lastPlayed });
        break;

      case 'RESET_WIRES':
        addLog(`🎲 ${players[turnIndex].name} KABLOLARI SIFIRLADI!`);
        const { nextExplodeId, newWires } = resetWires();
        syncInGameState({ wires: newWires, explodingWireId: nextExplodeId, lastPlayedCard: lastPlayed });
        break;

      case 'SHIELD':
        addLog(`🛡️ ${players[turnIndex].name} KALKAN TAKINDI!`);
        const shieldPlayers = updatedPlayers.map((p, idx) => idx === turnIndex ? { ...p, hasShield: true } : p);
        setPlayers(shieldPlayers);
        syncInGameState({ players: shieldPlayers, lastPlayedCard: lastPlayed });
        break;

      case 'STEAL':
        if (targetPlayer) {
          const targetIdx = players.findIndex(p => p.id === targetPlayer.id);
          const victim = updatedPlayers[targetIdx];
          if (victim && victim.hand.length > 0) {
            const stolenCard = victim.hand[0];
            const stolenPlayers = updatedPlayers.map((p, idx) => {
              if (idx === targetIdx) return { ...p, hand: p.hand.filter(c => c.uniqueId !== stolenCard.uniqueId) };
              if (idx === turnIndex) return { ...p, hand: [...p.hand, stolenCard] };
              return p;
            });
            setPlayers(stolenPlayers);
            addLog(`🃏 ${players[turnIndex].name}, ${targetName}'DAN KART ÇALDI!`);
            syncInGameState({ players: stolenPlayers, lastPlayedCard: lastPlayed });
          } else {
            const extraPlayers = giveCardToPlayer(turnIndex);
            addLog(`🃏 ${players[turnIndex].name} DESTDENDEN KART ÇEKTİ!`);
            syncInGameState({ players: extraPlayers, lastPlayedCard: lastPlayed });
          }
        } else {
          const extraPlayers = giveCardToPlayer(turnIndex);
          addLog(`🃏 ${players[turnIndex].name} +1 KART ÇEKTİ!`);
          syncInGameState({ players: extraPlayers, lastPlayedCard: lastPlayed });
        }
        break;

      default:
        break;
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        turnIndex,
        timeLeft,
        players,
        wires,
        currentQuestion,
        logs,
        lastPlayedCard,
        wireEffect,
        myPlayerId,
        setMyPlayerId,
        isMyTurn,
        startGame,
        answerQuestion,
        handleMiniGameResult,
        playCard
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);