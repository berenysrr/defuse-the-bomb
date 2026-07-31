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
  { id: 1, question: "İçinde 'A' harfi bulunmayan şehir hangisidir?", options: ["İzmir", "Ankara", "Bursa", "Adana"], correct: 0 },
  { id: 2, question: "Hangisi bir çizgi film karakteri DEĞİLDİR?", options: ["SüngerBob", "Pikachu", "Einstein", "Bugs Bunny"], correct: 2 },
  { id: 3, question: "Türkiye'nin başkenti neresidir?", options: ["İstanbul", "Ankara", "İzmir", "Antalya"], correct: 1 },
  { id: 4, question: "Hangisi bir asal sayı DEĞİLDİR?", options: ["2", "7", "9", "13"], correct: 2 },
  { id: 5, question: "Güneş sistemindeki en büyük gezegen hangisidir?", options: ["Mars", "Jüpiter", "Satürn", "Venüs"], correct: 1 },
  { id: 6, isMiniGame: true, type: 'CODE_BREAKER' },
  { id: 7, question: "Satrançta en güçlü taş hangisidir?", options: ["Kale", "Vezir", "At", "Şah"], correct: 1 },
  { id: 8, question: "Hangisi tatlı bir meyvedir?", options: ["Elma", "Tuz", "Biber", "Soğan"], correct: 0 },
  { id: 9, isMiniGame: true, type: 'REFLEX_TAP' },
  { id: 10, question: "Suyun kimyasal formülü nedir?", options: ["CO2", "H2O", "NaCl", "O2"], correct: 1 },
  { id: 11, question: "Kırmızı ile Sarının karışımından hangi renk elde edilir?", options: ["Yeşil", "Turuncu", "Mor", "Mavi"], correct: 1 },
  { id: 12, question: "Dünyanın en yüksek dağı hangisidir?", options: ["Ağrı Dağı", "Everest", "Alpler", "Kafdağı"], correct: 1 },
  { id: 13, question: "İstiklal Marşı'mızın şairi kimdir?", options: ["Ziya Gökalp", "Mehmet Akif Ersoy", "Namık Kemal", "Orhan Veli"], correct: 1 },
  { id: 14, question: "Hangisi uçabilen tek memeli hayvandır?", options: ["Yasa Tobi", "Yasa Kuşu", "Yasa Balığı", "Yasa Yarasa"], correct: 3 },
  { id: 15, question: "Hangi organımız vücuda kan pompalar?", options: ["Akciğer", "Kalp", "Karaciğer", "Böbrek"], correct: 1 },
  { id: 16, question: "Türkiye'nin en uzun nehri hangisidir?", options: ["Kızılırmak", "Yeşilırmak", "Fırat", "Dicle"], correct: 0 },
  { id: 17, question: "Fatih Sultan Mehmet kaç yılında İstanbul'u fethetti?", options: ["1071", "1299", "1453", "1923"], correct: 2 },
  { id: 18, question: "Periyodik tabloda 'O' simgesi hangi elementi temsil eder?", options: ["Oksijen", "Altın", "Demir", "Gümüş"], correct: 0 },
  { id: 19, question: "Futbolda bir takım sahada aynı anda kaç oyuncu ile yer alır?", options: ["9", "10", "11", "12"], correct: 2 },
  { id: 20, question: "Hangisi kış mevsimi ayıdır?", options: ["Ocak", "Nisan", "Temmuz", "Ekim"], correct: 0 },
  { id: 21, question: "Dünyanın en büyük okyanusu hangisidir?", options: ["Atlas Okyanusu", "Büyük Okyanus (Pasifik)", "Hint Okyanusu", "Arktik Okyanusu"], correct: 1 },
  { id: 22, question: "Gökkuşağında kaç renk bulunur?", options: ["5", "6", "7", "8"], correct: 2 },
  { id: 23, question: "Piramitleri ile ünlü ülke hangisidir?", options: ["Yunanistan", "Mısır", "İtalya", "Çin"], correct: 1 },
  { id: 24, question: "Mona Lisa tablosu hangi ressama aittir?", options: ["Picasso", "Van Gogh", "Leonardo da Vinci", "Salvador Dali"], correct: 2 },
  { id: 25, question: "Telefonu kim icat etmiştir?", options: ["Graham Bell", "Edison", "Tesla", "Newton"], correct: 0 }
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

  const [turnIndex, setTurnIndex] = useState(0); 
  const [turnDirection, setTurnDirection] = useState(1); 
  const [timeLeft, setTimeLeft] = useState(60);

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
        if (s.players) setPlayers(s.players);
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