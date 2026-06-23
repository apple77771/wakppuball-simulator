// ============================================================================
// 1. 고음질 물리 모델링 ASMR 오디오 합성 엔진 (Organic ASMR Synth)
// ============================================================================
class AudioSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute(forceState) {
    this.muted = forceState !== undefined ? forceState : !this.muted;
    if (!this.muted) this.resume();
    return this.muted;
  }

  // 1-1. 실제 왁스 코팅이 으스러지는 '꽈자작! 꽈득! 아작아작' 리얼 크런치 사운드
  // (전자음 느낌을 완전히 배제하고 오가닉한 물리적 파열음 구현)
  playCrunch(pitchMultiplier = 1.0) {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    // -------------------------------------------------------------
    // 레이어 A: '꽈득!' 둔탁하게 부서지는 왁스 본체의 저주파 타격음 (Dull Snap)
    // -------------------------------------------------------------
    // 노이즈 대신 브라운 노이즈(낮고 묵직한 마찰)를 시뮬레이션하기 위해
    // 핑크/화이트 노이즈 버퍼를 로우패스 필터로 매우 낮게 걸러 사용합니다.
    const snapBufferSize = this.ctx.sampleRate * 0.08;
    const snapBuffer = this.ctx.createBuffer(1, snapBufferSize, this.ctx.sampleRate);
    const snapData = snapBuffer.getChannelData(0);
    for (let i = 0; i < snapBufferSize; i++) {
      snapData[i] = Math.random() * 2 - 1;
    }
    const snapSource = this.ctx.createBufferSource();
    snapSource.buffer = snapBuffer;

    const snapFilter = this.ctx.createBiquadFilter();
    snapFilter.type = 'bandpass';
    snapFilter.frequency.setValueAtTime(450 * pitchMultiplier, now); // 450Hz 부근의 무거운 둔탁음
    snapFilter.Q.setValueAtTime(4, now);

    const snapGain = this.ctx.createGain();
    snapGain.gain.setValueAtTime(0.7, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    snapSource.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snapSource.start(now);
    snapSource.stop(now + 0.07);

    // -------------------------------------------------------------
    // 레이어 B: '꽈자작! 아작!' 표면이 여러 갈래로 쩍쩍 쪼개지는 파열음
    // -------------------------------------------------------------
    // 연속적인 노이즈가 아닌, 불규칙하게 군집된 짧은 임펄스 신호들로 구성합니다.
    const crackleCount = 4 + Math.floor(Math.random() * 4); // 4~7개의 마이크로 파편음
    for (let i = 0; i < crackleCount; i++) {
      // 0~60ms 사이의 불규칙한 지연 발생 (아작아작하는 텍스처 구현)
      const delay = i * 0.012 + Math.random() * 0.015;
      
      const impulseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.015, this.ctx.sampleRate);
      const impulseData = impulseBuffer.getChannelData(0);
      for (let j = 0; j < impulseData.length; j++) {
        impulseData[j] = Math.random() * 2 - 1;
      }
      const impulseSource = this.ctx.createBufferSource();
      impulseSource.buffer = impulseBuffer;

      const impulseFilter = this.ctx.createBiquadFilter();
      // 머리 아픈 초고주파를 피해 자연스럽고 건조한 1.2kHz~1.8kHz 대역 사용
      impulseFilter.type = 'bandpass';
      impulseFilter.frequency.setValueAtTime((1100 + Math.random() * 600) * pitchMultiplier, now + delay);
      impulseFilter.Q.setValueAtTime(8, now + delay);

      const impulseGain = this.ctx.createGain();
      impulseGain.gain.setValueAtTime(0.35, now + delay);
      impulseGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.012);

      impulseSource.connect(impulseFilter);
      impulseFilter.connect(impulseGain);
      impulseGain.connect(this.ctx.destination);

      impulseSource.start(now + delay);
      impulseSource.stop(now + delay + 0.02);
    }
  }

  // 1-2. 왁스 껍질이 최종적으로 통째로 터질 때의 둔탁한 팝핑 사운드 (Final Burst)
  playPop(freq = 120) {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    // 묵직한 고무/플라스틱 막 터지는 소리
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(180, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.ctx.destination);

    // 퍽 터지며 흩어지는 둔탁한 공기 파열 마찰음 (머리 아픈 고음 차단)
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(600, now); // 고역 차단하여 먹먹하고 묵직하게

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.31);
    noise.start(now);
    noise.stop(now + 0.21);
  }

  // 1-3. 미니 왁볼 개별 파쇄음
  playMiniPop() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.45, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  // 1-4. 점토/클레이를 으깨고 쪼물딱거릴 때 나는 리얼한 '쩍쩍, 질퍽한' 기포 사운드 (Wet Clay Squelch)
  // (전자음 성분을 완전히 없애고 물기 있는 찰떡과 점토 마찰 소리를 정교하게 합성)
  playSquelch(intensity = 0.5) {
    if (this.muted || !this.ctx) return;
    
    const now = this.ctx.currentTime;

    // 1) 점토가 비벼질 때의 묵직하고 먹먹한 저역대 마찰음 (Doughy friction)
    const frictionBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const frictionData = frictionBuffer.getChannelData(0);
    for (let i = 0; i < frictionData.length; i++) {
      frictionData[i] = Math.random() * 2 - 1;
    }
    const frictionSource = this.ctx.createBufferSource();
    frictionSource.buffer = frictionBuffer;

    const frictionFilter = this.ctx.createBiquadFilter();
    frictionFilter.type = 'lowpass';
    // 100Hz~150Hz 부근의 극저음 필터링으로 '스윽 스윽' 비벼지는 찰떡 소리 구현
    frictionFilter.frequency.setValueAtTime(110 + intensity * 40, now);

    const frictionGain = this.ctx.createGain();
    const targetFriction = Math.min(0.28 * intensity, 0.35);
    frictionGain.gain.setValueAtTime(0.001, now);
    frictionGain.gain.linearRampToValueAtTime(targetFriction, now + 0.04);
    frictionGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    frictionSource.connect(frictionFilter);
    frictionFilter.connect(frictionGain);
    frictionGain.connect(this.ctx.destination);
    frictionSource.start(now);
    frictionSource.stop(now + 0.15);

    // 2) 찰떡을 쥘 때 끈적하게 기포가 쩍쩍 터지는 사운드 (Wet Sticky Micro-Pops)
    // 여러 개의 짧은 극소형 주파수 스윕(Bubble sweeps)을 마이크로 단위로 배치
    const bubbleCount = 3 + Math.floor(Math.random() * 4); // 3~6개 기포
    for (let i = 0; i < bubbleCount; i++) {
      const bubbleDelay = i * 0.015 + Math.random() * 0.02;
      
      const osc = this.ctx.createOscillator();
      osc.type = 'sine'; // 순수 사인파로 부드럽고 쩍쩍거리는 물기포 구현
      
      // 180Hz -> 50Hz 근방으로 빠르게 떨어지는 찰떡 속 기포 수축 표현
      const startFreq = 160 + Math.random() * 90;
      osc.frequency.setValueAtTime(startFreq, now + bubbleDelay);
      osc.frequency.exponentialRampToValueAtTime(40, now + bubbleDelay + 0.015);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now + bubbleDelay);

      const gainNode = this.ctx.createGain();
      const targetGain = (0.07 + Math.random() * 0.06) * intensity;
      gainNode.gain.setValueAtTime(0.001, now + bubbleDelay);
      gainNode.gain.linearRampToValueAtTime(targetGain, now + bubbleDelay + 0.003);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + bubbleDelay + 0.015);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now + bubbleDelay);
      osc.stop(now + bubbleDelay + 0.02);
    }
  }

  // 1-5. 점토 반죽을 당겼다 놓았을 때 찰싹! 얹어지는 타격 찰떡 사운드 (Wet Slap)
  playSlap(intensity = 0.5) {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;

    // 1) 찰떡 덩어리가 엉겨 붙으며 나는 묵직한 '쩍-' 소리
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.06);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.55 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    // 2) 찰싹 달라붙는 표면 습기 찰싹음
    const slapBufferSize = this.ctx.sampleRate * 0.06;
    const slapBuffer = this.ctx.createBuffer(1, slapBufferSize, this.ctx.sampleRate);
    const slapData = slapBuffer.getChannelData(0);
    for (let i = 0; i < slapBufferSize; i++) {
      slapData[i] = Math.random() * 2 - 1;
    }
    const slapSource = this.ctx.createBufferSource();
    slapSource.buffer = slapBuffer;

    const slapFilter = this.ctx.createBiquadFilter();
    slapFilter.type = 'bandpass';
    slapFilter.frequency.setValueAtTime(380, now); // 380Hz 부근의 축축한 마찰대역
    slapFilter.Q.setValueAtTime(2, now);

    const slapGain = this.ctx.createGain();
    slapGain.gain.setValueAtTime(0.35 * intensity, now);
    slapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    slapSource.connect(slapFilter);
    slapFilter.connect(slapGain);
    slapGain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
    slapSource.start(now);
    slapSource.stop(now + 0.06);
  }
}

const audio = new AudioSynth();


// ============================================================================
// 2. 물리 입자 시스템 (Physics Particle System for Debris)
// ============================================================================
class Particle {
  constructor(x, y, color, size, type = 'normal') {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.type = type;
    
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.8 + Math.random() * 5.2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 2.0; 
    
    this.gravity = 0.28;
    this.friction = 0.97;
    this.bounce = 0.45;
    this.life = 1.0;
    this.decay = 0.012 + Math.random() * 0.018;
    
    this.rotation = Math.random() * Math.PI * 2;
    this.vRotation = (Math.random() - 0.5) * 0.3;
  }

  update(width, height) {
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;
    
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.vRotation;
    
    this.life -= this.decay;

    if (this.y > height - this.size) {
      this.y = height - this.size;
      this.vy = -this.vy * this.bounce;
      this.vx *= 0.7;
    }
    if (this.x < this.size) {
      this.x = this.size;
      this.vx = -this.vx * this.bounce;
    } else if (this.x > width - this.size) {
      this.x = width - this.size;
      this.vx = -this.vx * this.bounce;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;

    if (this.type === 'normal') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'flake') {
      ctx.fillRect(-this.size, -this.size * 0.6, this.size * 2, this.size * 1.2);
    } else if (this.type === 'apple') {
      ctx.fillStyle = '#ff3366';
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#76ff03';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (this.type === 'star') {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.size,
                   Math.sin((18 + i * 72) * Math.PI / 180) * this.size);
        ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.size / 2),
                   Math.sin((54 + i * 72) * Math.PI / 180) * (this.size / 2));
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}


// ============================================================================
// 3. 점떡같이 쫀쫀하고 질퍽한 소프트바디 반죽 엔진 (Doughy Soft-Body Physics)
// ============================================================================
class SoftBodyParticle {
  constructor(x, y, isCenter = false) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.isCenter = isCenter;
  }
}

class SoftBody {
  constructor(x, y, radius, color, shardColor, shardCount, toppings = []) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.shardColor = shardColor;
    
    this.particles = [];
    this.springs = [];
    
    // 극단의 찰떡 질감을 구현하기 위한 탄성 계수 최적화
    this.kCenter = 0.015;
    this.kEdge = 0.32;
    this.damping = 0.65;
    this.gravity = 0.03;

    this.draggedParticleIdx = -1;

    this.init(x, y, radius);
    this.initShards(shardCount, toppings);
  }

  init(cx, cy, r) {
    const center = new SoftBodyParticle(cx, cy, true);
    this.particles.push(center);

    const points = 16;
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      this.particles.push(new SoftBodyParticle(px, py));
    }

    for (let i = 1; i <= points; i++) {
      this.springs.push({
        p1: 0,
        p2: i,
        length: r
      });
    }
    for (let i = 1; i <= points; i++) {
      const next = i === points ? 1 : i + 1;
      const angleStep = (Math.PI * 2) / points;
      const edgeLen = 2 * r * Math.sin(angleStep / 2);
      this.springs.push({
        p1: i,
        p2: next,
        length: edgeLen
      });
      
      const diagonalNext = i + 4 > points ? i + 4 - points : i + 4;
      const diagLen = 2 * r * Math.sin((angleStep * 4) / 2);
      this.springs.push({
        p1: i,
        p2: diagonalNext,
        length: diagLen * 0.95
      });
    }
  }

  initShards(count, toppings) {
    this.shards = [];
    for (let i = 0; i < count; i++) {
      const pIndex = 1 + Math.floor(Math.random() * (this.particles.length - 1));
      const ratio = 0.12 + Math.random() * 0.78; 
      const angleOffset = (Math.random() - 0.5) * 0.45;
      const size = 6 + Math.random() * 11;
      
      this.shards.push({
        pIndex,
        ratio,
        angleOffset,
        size,
        color: Array.isArray(this.shardColor) ? this.shardColor[Math.floor(Math.random() * this.shardColor.length)] : this.shardColor,
        type: toppings.length > 0 ? toppings[Math.floor(Math.random() * toppings.length)] : 'normal'
      });
    }
  }

  update(pointer, canvasWidth, canvasHeight) {
    const points = this.particles.length;

    if (pointer.active) {
      if (this.draggedParticleIdx === -1) {
        let nearestDist = Infinity;
        for (let i = 0; i < points; i++) {
          const dx = this.particles[i].x - pointer.x;
          const dy = this.particles[i].y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            this.draggedParticleIdx = i;
          }
        }
      }

      if (this.draggedParticleIdx !== -1) {
        const target = this.particles[this.draggedParticleIdx];
        target.x = pointer.x;
        target.y = pointer.y;
        target.vx = 0;
        target.vy = 0;

        const dragSpeed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
        if (dragSpeed > 2.0) {
          audio.playSquelch(dragSpeed * 0.18); // 찰떡 질척이는 쩍쩍 사운드
          if (navigator.vibrate && Math.random() < 0.18) {
            navigator.vibrate(6);
          }
        }
      }
    } else {
      if (this.draggedParticleIdx !== -1) {
        const center = this.particles[0];
        const draggedP = this.particles[this.draggedParticleIdx];
        const distFromCenter = Math.hypot(draggedP.x - center.x, draggedP.y - center.y);
        
        if (distFromCenter > this.radius * 1.4) {
          audio.playSlap(Math.min(distFromCenter / (this.radius * 2), 1.0)); // 당겼다 놓을 때 찰싹!
          if (navigator.vibrate) navigator.vibrate(15);
        }
        this.draggedParticleIdx = -1;
      }
    }

    for (let i = 0; i < this.springs.length; i++) {
      const spring = this.springs[i];
      const p1 = this.particles[spring.p1];
      const p2 = this.particles[spring.p2];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) continue;

      const diff = dist - spring.length;
      const k = spring.p1 === 0 ? this.kCenter : this.kEdge;
      const fx = (dx / dist) * diff * k;
      const fy = (dy / dist) * diff * k;

      if (spring.p1 === 0) {
        p1.vx += fx * 0.35;
        p1.vy += fy * 0.35;
        p2.vx -= fx * 0.65;
        p2.vy -= fy * 0.65;
      } else {
        p1.vx += fx * 0.5;
        p1.vy += fy * 0.5;
        p2.vx -= fx * 0.5;
        p2.vy -= fy * 0.5;
      }
    }

    for (let i = 0; i < points; i++) {
      if (pointer.active && i === this.draggedParticleIdx) continue;

      const p = this.particles[i];
      if (!p.isCenter) p.vy += this.gravity;
      
      p.vx *= this.damping;
      p.vy *= this.damping;
      
      p.x += p.vx;
      p.y += p.vy;

      const buffer = 45;
      if (p.x < buffer) { p.x = buffer; p.vx = 0; }
      if (p.x > canvasWidth - buffer) { p.x = canvasWidth - buffer; p.vx = 0; }
      if (p.y < buffer) { p.y = buffer; p.vy = 0; }
      if (p.y > canvasHeight - buffer) { p.y = canvasHeight - buffer; p.vy = 0; }
    }
  }

  draw(ctx) {
    const pointsCount = this.particles.length - 1;
    const center = this.particles[0];

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 25;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';

    ctx.beginPath();
    const firstPt = this.particles[1];
    const lastPt = this.particles[pointsCount];
    let startX = (firstPt.x + lastPt.x) / 2;
    let startY = (firstPt.y + lastPt.y) / 2;
    ctx.moveTo(startX, startY);

    for (let i = 1; i <= pointsCount; i++) {
      const p = this.particles[i];
      const nextP = this.particles[i === pointsCount ? 1 : i + 1];
      const xc = (p.x + nextP.x) / 2;
      const yc = (p.y + nextP.y) / 2;
      ctx.quadraticCurveTo(p.x, p.y, xc, yc);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    const grad = ctx.createRadialGradient(center.x - this.radius*0.25, center.y - this.radius*0.25, 4, center.x, center.y, this.radius * 1.4);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    for (let i = 1; i <= pointsCount; i++) {
      const p = this.particles[i];
      const nextP = this.particles[i === pointsCount ? 1 : i + 1];
      ctx.quadraticCurveTo(p.x, p.y, (p.x + nextP.x)/2, (p.y + nextP.y)/2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < this.shards.length; i++) {
      const shard = this.shards[i];
      const boundaryP = this.particles[shard.pIndex];
      
      const baseAngle = Math.atan2(boundaryP.y - center.y, boundaryP.x - center.x) + shard.angleOffset;
      const dist = Math.hypot(boundaryP.x - center.x, boundaryP.y - center.y) * shard.ratio;
      
      const shardX = center.x + Math.cos(baseAngle) * dist;
      const shardY = center.y + Math.sin(baseAngle) * dist;

      ctx.save();
      ctx.translate(shardX, shardY);
      ctx.rotate(baseAngle);
      ctx.fillStyle = shard.color;
      
      if (shard.type === 'normal') {
        ctx.beginPath();
        const s = shard.size;
        ctx.moveTo(-s, -s);
        ctx.lineTo(s * 0.8, -s * 0.7);
        ctx.lineTo(s * 0.9, s * 0.6);
        ctx.lineTo(-s * 0.1, s * 0.9);
        ctx.lineTo(-s * 0.8, s * 0.3);
        ctx.closePath();
        ctx.fill();
      } else if (shard.type === 'apple') {
        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.arc(0, 0, shard.size, 0, Math.PI, true);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (shard.type === 'star') {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        const r = shard.size;
        for (let j = 0; j < 5; j++) {
          ctx.lineTo(Math.cos((18 + j * 72) * Math.PI / 180) * r, Math.sin((18 + j * 72) * Math.PI / 180) * r);
          ctx.lineTo(Math.cos((54 + j * 72) * Math.PI / 180) * (r / 2), Math.sin((54 + j * 72) * Math.PI / 180) * (r / 2));
        }
        ctx.closePath();
        ctx.fill();
      } else if (shard.type === 'flake') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-shard.size, -shard.size * 0.5, shard.size * 2, shard.size);
      }
      ctx.restore();
    }
  }
}


// ============================================================================
// 4. 왁뿌볼 종류별 시뮬레이션 클래스군 (Interactive Ball Classes)
// ============================================================================

// ----------------------------------------------------------------------------
// 스킨 1. 청사과 아삭 왁뿌 (Green Apple)
// ----------------------------------------------------------------------------
class GreenAppleBall {
  constructor(cx, cy) {
    this.name = "청사과 아삭 왁뿌";
    this.cx = cx;
    this.cy = cy;
    this.r = 100;
    
    this.stage = 0;
    this.pressure = 0.0;
    this.crackProgress = 0.0;
    this.deformX = 0;
    this.deformY = 0;
    
    this.softBody = null;
    this.segments = 6;
  }

  update(pointer, width, height, particles) {
    if (this.stage === 2) {
      if (this.softBody) this.softBody.update(pointer, width, height);
      return;
    }

    const dx = pointer.x - this.cx;
    const dy = pointer.y - this.cy;
    const dist = Math.hypot(dx, dy);

    if (pointer.active && dist < this.r + 20) {
      this.deformX = (pointer.x - this.cx) * 0.22;
      this.deformY = (pointer.y - this.cy) * 0.22;

      const dragSpeed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
      this.pressure += 0.009 + dragSpeed * 0.002;
      
      if (this.pressure > 0.3) {
        this.stage = 1;
        this.crackProgress = (this.pressure - 0.3) / 0.7;
      }

      // 왁스 으깨짐 소리 (리얼 아작아작)
      if (Math.random() < 0.15) {
        audio.playCrunch(1.0); 
        if (navigator.vibrate) navigator.vibrate(8);
        particles.push(new Particle(pointer.x, pointer.y, '#76ff03', 3 + Math.random()*3));
      }

      if (this.pressure >= 1.0) {
        this.explode(particles);
      }
    } else {
      this.deformX *= 0.82;
      this.deformY *= 0.82;
    }
  }

  explode(particles) {
    this.stage = 2;
    this.pressure = 1.0;
    
    audio.playPop(170);
    if (navigator.vibrate) navigator.vibrate([30, 60, 120]);

    for (let i = 0; i < 25; i++) {
      const px = this.cx + (Math.random() - 0.5) * this.r;
      const py = this.cy + (Math.random() - 0.5) * this.r;
      particles.push(new Particle(px, py, '#76ff03', 4 + Math.random() * 8, 'normal'));
      if (Math.random() < 0.35) {
        particles.push(new Particle(px, py, '#ff3366', 6 + Math.random() * 4, 'apple'));
      }
      if (Math.random() < 0.45) {
        particles.push(new Particle(px, py, '#ffd700', 5 + Math.random() * 5, 'star'));
      }
    }

    this.softBody = new SoftBody(this.cx, this.cy, this.r * 1.06, '#ffffff', ['#76ff03', '#ccff90'], 20, ['normal', 'apple', 'star']);
  }

  draw(ctx) {
    ctx.save();

    if (this.stage === 2) {
      if (this.softBody) this.softBody.draw(ctx);
      ctx.restore();
      return;
    }

    ctx.translate(this.cx + this.deformX, this.cy + this.deformY);

    const gradBalloon = ctx.createRadialGradient(-15, -15, 0, 0, 0, this.r * 1.1);
    gradBalloon.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    gradBalloon.addColorStop(0.8, 'rgba(118, 255, 3, 0.12)');
    gradBalloon.addColorStop(1, 'rgba(118, 255, 3, 0.5)');
    ctx.fillStyle = gradBalloon;
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 1.06, 0, Math.PI * 2);
    ctx.fill();

    const gradApple = ctx.createRadialGradient(-20, -20, 5, 0, 0, this.r);
    gradApple.addColorStop(0, '#ccff90');
    gradApple.addColorStop(0.6, '#76ff03');
    gradApple.addColorStop(1, '#2e5c00');
    ctx.fillStyle = gradApple;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(248, 113, 113, 0.35)';
    ctx.beginPath();
    ctx.arc(-30, 20, 14, 0, Math.PI, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.beginPath();
    ctx.arc(30, -20, 12, 0, Math.PI * 2);
    ctx.fill();

    if (this.stage === 1) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1 + this.crackProgress * 8;
      
      for (let i = 0; i < this.segments; i++) {
        const angle = (i / this.segments) * Math.PI;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.r * Math.abs(Math.cos(angle)), this.r, angle, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }
}

// ----------------------------------------------------------------------------
// 스킨 2. 3레이어 버터 왁뿌 (3-Layer Butter Stick)
// ----------------------------------------------------------------------------
class ButterStickBall {
  constructor(cx, cy) {
    this.name = "3레이어 버터 왁뿌";
    this.cx = cx;
    this.cy = cy;
    this.w = 200;
    this.h = 80;
    
    this.stage = 0;
    this.gridCols = 8;
    this.gridRows = 3;
    this.flakes = [];
    this.initFlakes();
    
    this.deformY = 0;
    this.softBody = null;
  }

  initFlakes() {
    const fw = this.w / this.gridCols;
    const fh = this.h / this.gridRows;
    const startX = -this.w / 2;
    const startY = -this.h / 2;

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        this.flakes.push({
          x: startX + c * fw + fw / 2,
          y: startY + r * fh + fh / 2,
          w: fw,
          h: fh,
          alive: true
        });
      }
    }
  }

  update(pointer, width, height, particles) {
    if (this.stage === 2) {
      if (this.softBody) this.softBody.update(pointer, width, height);
      return;
    }

    const xMin = this.cx - this.w / 2 - 10;
    const xMax = this.cx + this.w / 2 + 10;
    const yMin = this.cy - this.h / 2 - 10;
    const yMax = this.cy + this.h / 2 + 10;

    if (pointer.active && pointer.x > xMin && pointer.x < xMax && pointer.y > yMin && pointer.y < yMax) {
      this.deformY = (pointer.y - this.cy) * 0.18;

      const rx = pointer.x - this.cx;
      const ry = pointer.y - this.cy;
      
      let peeledSomething = false;

      this.flakes.forEach(flake => {
        if (flake.alive) {
          const dx = rx - flake.x;
          const dy = ry - flake.y;
          if (Math.hypot(dx, dy) < 42) {
            flake.alive = false;
            peeledSomething = true;
            particles.push(new Particle(pointer.x, pointer.y, '#f5f5f5', 3 + Math.random() * 5, 'flake'));
          }
        }
      });

      if (peeledSomething) {
        this.stage = 1;
        audio.playCrunch(0.7); 
        if (navigator.vibrate) navigator.vibrate(7);
      }

      const aliveCount = this.flakes.filter(f => f.alive).length;
      const total = this.flakes.length;
      
      if (aliveCount / total <= 0.25) {
        this.explode(particles);
      }
    } else {
      this.deformY *= 0.82;
    }
  }

  explode(particles) {
    this.stage = 2;
    audio.playPop(115);
    if (navigator.vibrate) navigator.vibrate([35, 45, 80]);

    for (let i = 0; i < 20; i++) {
      const px = this.cx + (Math.random() - 0.5) * this.w;
      const py = this.cy + (Math.random() - 0.5) * this.h;
      particles.push(new Particle(px, py, '#ffffff', 4 + Math.random() * 6, 'flake'));
      if (Math.random() < 0.5) {
        particles.push(new Particle(px, py, '#fff59d', 3 + Math.random() * 5, 'normal'));
      }
    }

    this.softBody = new SoftBody(this.cx, this.cy, this.w * 0.46, '#ffe082', '#ffffff', 22, ['flake']);
  }

  draw(ctx) {
    ctx.save();

    if (this.stage === 2) {
      if (this.softBody) this.softBody.draw(ctx);
      ctx.restore();
      return;
    }

    ctx.translate(this.cx, this.cy);
    ctx.scale(1.0, 1.0 + this.deformY / this.h);

    const gradButter = ctx.createLinearGradient(-this.w/2, -this.h/2, -this.w/2, this.h/2);
    gradButter.addColorStop(0, '#fff9c4');
    gradButter.addColorStop(0.5, '#ffd54f');
    gradButter.addColorStop(1, '#f57f17');
    ctx.fillStyle = gradButter;
    ctx.beginPath();
    ctx.roundRect(-this.w / 2, -this.h / 2, this.w, this.h, 12);
    ctx.fill();

    ctx.font = '800 24px var(--font-title)';
    ctx.fillStyle = 'rgba(13, 71, 161, 0.45)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.rotate(-0.06);
    ctx.fillText('BUTTER', 0, 0);
    ctx.restore();

    this.flakes.forEach(flake => {
      if (flake.alive) {
        ctx.save();
        ctx.fillStyle = '#fcfcfc';
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(flake.x - flake.w/2, flake.y - flake.h/2, flake.w, flake.h, 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    });

    ctx.strokeStyle = 'rgba(13, 71, 161, 0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-this.w/2 + 20, -this.h/2, 20, this.h);

    ctx.restore();
  }
}

// ----------------------------------------------------------------------------
// 스킨 3. 크리스피 미니 왁볼 (Crispy Mini Balloon)
// ----------------------------------------------------------------------------
class MiniWaxBead {
  constructor(x, y, r, color) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.color = color;
    
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    
    this.stage = 0;
    this.pressure = 0;
  }
}

class MiniBalloonBall {
  constructor(cx, cy) {
    this.name = "크리스피 미니 왁볼";
    this.cx = cx;
    this.cy = cy;
    this.r = 110;
    
    this.stage = 0;
    this.softBody = null;

    this.beads = [
      new MiniWaxBead(cx - 30, cy - 20, 24, '#f06292'),
      new MiniWaxBead(cx + 40, cy - 10, 26, '#4dd0e1'),
      new MiniWaxBead(cx - 5, cy + 35, 25, '#fff176')
    ];
  }

  update(pointer, width, height, particles) {
    if (this.stage === 2) {
      if (this.softBody) this.softBody.update(pointer, width, height);
      return;
    }

    for (let i = 0; i < this.beads.length; i++) {
      const b = this.beads[i];
      if (b.stage === 2) continue;

      b.vx *= 0.98;
      b.vy *= 0.98;
      b.x += b.vx;
      b.y += b.vy;

      const dx = b.x - this.cx;
      const dy = b.y - this.cy;
      const dist = Math.hypot(dx, dy);
      const limit = this.r - b.r - 8;
      
      if (dist > limit) {
        const angle = Math.atan2(dy, dx);
        b.x = this.cx + Math.cos(angle) * limit;
        b.y = this.cy + Math.sin(angle) * limit;
        const speed = Math.hypot(b.vx, b.vy);
        b.vx = -Math.cos(angle) * Math.max(speed, 0.6);
        b.vy = -Math.sin(angle) * Math.max(speed, 0.6);
      }

      for (let j = i + 1; j < this.beads.length; j++) {
        const other = this.beads[j];
        if (other.stage === 2) continue;

        const bx = other.x - b.x;
        const by = other.y - b.y;
        const bDist = Math.hypot(bx, by);
        const minDist = b.r + other.r;

        if (bDist < minDist) {
          const overlap = minDist - bDist;
          const angle = Math.atan2(by, bx);
          
          b.x -= Math.cos(angle) * overlap * 0.5;
          b.y -= Math.sin(angle) * overlap * 0.5;
          other.x += Math.cos(angle) * overlap * 0.5;
          other.y += Math.sin(angle) * overlap * 0.5;

          const tempVx = b.vx;
          const tempVy = b.vy;
          b.vx = other.vx * 0.8;
          b.vy = other.vy * 0.8;
          other.vx = tempVx * 0.8;
          other.vy = tempVy * 0.8;
        }
      }
    }

    if (pointer.active) {
      this.beads.forEach(b => {
        if (b.stage !== 2) {
          const dx = pointer.x - b.x;
          const dy = pointer.y - b.y;
          const dist = Math.hypot(dx, dy);

          if (dist < b.r + 18) {
            b.pressure += 0.055;
            b.stage = 1;
            
            b.vx += (Math.random() - 0.5) * 3;
            b.vy += (Math.random() - 0.5) * 3;

            if (Math.random() < 0.18) {
              audio.playCrunch(1.35); 
              if (navigator.vibrate) navigator.vibrate(5);
            }

            if (b.pressure >= 1.0) {
              b.stage = 2;
              audio.playMiniPop();
              if (navigator.vibrate) navigator.vibrate([10, 35]);

              for (let k = 0; k < 12; k++) {
                particles.push(new Particle(b.x, b.y, b.color, 3 + Math.random() * 5));
              }
            }
          }
        }
      });

      const allBursted = this.beads.every(b => b.stage === 2);
      if (allBursted && this.stage !== 2) {
        this.explode(particles);
      }
    }
  }

  explode(particles) {
    this.stage = 2;
    audio.playPop(190);
    if (navigator.vibrate) navigator.vibrate([30, 40, 90]);

    this.softBody = new SoftBody(
      this.cx, 
      this.cy, 
      this.r * 0.9, 
      'rgba(255, 255, 255, 0.22)', 
      ['#ff80ab', '#80deea', '#ffff8d'], 
      22, 
      ['normal']
    );
  }

  draw(ctx) {
    ctx.save();

    if (this.stage === 2) {
      if (this.softBody) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2.5;
        this.softBody.draw(ctx);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.05)';
    const gradBalloon = ctx.createRadialGradient(-20, -20, 0, 0, 0, this.r);
    gradBalloon.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    gradBalloon.addColorStop(0.8, 'rgba(255, 255, 255, 0.06)');
    gradBalloon.addColorStop(1, 'rgba(255, 255, 255, 0.28)');
    ctx.fillStyle = gradBalloon;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy - this.r, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.beads.forEach(b => {
      if (b.stage !== 2) {
        ctx.save();
        const beadGrad = ctx.createRadialGradient(b.x - b.r*0.2, b.y - b.r*0.2, 2, b.x, b.y, b.r);
        beadGrad.addColorStop(0, '#ffffff');
        beadGrad.addColorStop(0.3, b.color);
        beadGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
        
        ctx.fillStyle = beadGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        if (b.stage === 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(b.x - b.r * 0.7, b.y);
          ctx.lineTo(b.x + b.r * 0.7, b.y);
          ctx.moveTo(b.x, b.y - b.r * 0.7);
          ctx.lineTo(b.x, b.y + b.r * 0.7);
          ctx.stroke();
        }
        ctx.restore();
      }
    });

    ctx.restore();
  }
}

// ----------------------------------------------------------------------------
// 스킨 4. 초코 바나나 왁뿌 (Choco Banana Muddy)
// ----------------------------------------------------------------------------
class ChocoBananaBall {
  constructor(cx, cy) {
    this.name = "초코 바나나 왁뿌";
    this.cx = cx;
    this.cy = cy;
    this.r = 95;
    
    this.stage = 0;
    this.pressure = 0;
    this.deformX = 0;
    this.deformY = 0;
    
    this.softBody = null;
  }

  update(pointer, width, height, particles) {
    if (this.stage === 2) {
      if (this.softBody) this.softBody.update(pointer, width, height);
      return;
    }

    const dx = pointer.x - this.cx;
    const dy = pointer.y - this.cy;
    const dist = Math.hypot(dx, dy);

    if (pointer.active && dist < this.r + 20) {
      this.deformX = (pointer.x - this.cx) * 0.17;
      this.deformY = (pointer.y - this.cy) * 0.17;

      const speed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
      this.pressure += 0.008 + speed * 0.0012;

      if (this.pressure > 0.25) {
        this.stage = 1;
      }

      if (Math.random() < 0.15) {
        audio.playCrunch(0.62); 
        if (navigator.vibrate) navigator.vibrate(6);
        particles.push(new Particle(pointer.x, pointer.y, '#4e342e', 3 + Math.random()*3));
      }

      if (this.pressure >= 1.0) {
        this.explode(particles);
      }
    } else {
      this.deformX *= 0.82;
      this.deformY *= 0.82;
    }
  }

  explode(particles) {
    this.stage = 2;
    audio.playPop(125);
    if (navigator.vibrate) navigator.vibrate([25, 35, 100]);

    for (let i = 0; i < 20; i++) {
      const px = this.cx + (Math.random() - 0.5) * this.r;
      const py = this.cy + (Math.random() - 0.5) * this.r;
      particles.push(new Particle(px, py, '#4e342e', 4 + Math.random() * 6));
      if (Math.random() < 0.4) {
        particles.push(new Particle(px, py, '#ffd54f', 3 + Math.random() * 4));
      }
    }

    this.softBody = new SoftBody(this.cx, this.cy, this.r * 1.05, '#ffd54f', '#4e342e', 22, ['normal']);
  }

  draw(ctx) {
    ctx.save();

    if (this.stage === 2) {
      if (this.softBody) this.softBody.draw(ctx);
      ctx.restore();
      return;
    }

    ctx.translate(this.cx + this.deformX, this.cy + this.deformY);

    ctx.save();
    ctx.shadowBlur = 25;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    const gradChoco = ctx.createRadialGradient(-15, -15, 5, 0, 0, this.r);
    gradChoco.addColorStop(0, '#5d4037');
    gradChoco.addColorStop(0.7, '#3e2723');
    gradChoco.addColorStop(1, '#1d0c07');
    ctx.fillStyle = gradChoco;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.stage === 1) {
      ctx.save();
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 1 + this.pressure * 6.5;
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ffd54f';

      const rays = 8;
      const progress = (this.pressure - 0.25) / 0.75;
      
      ctx.beginPath();
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2;
        const targetR = this.r * (0.4 + progress * 0.6);
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * targetR, Math.sin(angle) * targetR);
      }
      ctx.stroke();

      ctx.beginPath();
      const rings = 3;
      for (let rIdx = 1; rIdx <= rings; rIdx++) {
        const ringR = (this.r * 0.3 * rIdx) * (0.5 + progress * 0.5);
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      }
      ctx.stroke();
      
      ctx.restore();
    }

    ctx.restore();
  }
}


// ============================================================================
// 5. 시뮬레이션 시스템 총괄 및 루프 제어 (Orchestrator / Main App)
// ============================================================================
class App {
  constructor() {
    this.canvas = document.getElementById('physics-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.btnAudio = document.getElementById('btn-audio-toggle');
    this.btnHaptic = document.getElementById('btn-haptic-toggle');
    this.btnReset = document.getElementById('btn-reset');
    this.hudBallName = document.getElementById('ball-name-display');
    this.hudStatus = document.getElementById('status-title');
    this.guideOverlay = document.getElementById('interaction-guide');
    this.cards = document.querySelectorAll('.skin-card');
    
    this.pointer = { x: 0, y: 0, px: 0, py: 0, active: false };
    this.hapticEnabled = true;
    
    this.activeSkin = 'green-apple';
    this.ball = null;
    this.particles = [];
    
    this.firstTouchOccurred = false;

    this.initEvents();
    this.resizeCanvas();
    this.spawnBall();
    this.animate();
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    if (this.ball) {
      this.ball.cx = rect.width / 2;
      this.ball.cy = rect.height / 2;
      if (this.ball.softBody) {
        const dx = rect.width / 2 - this.ball.softBody.particles[0].x;
        const dy = rect.height / 2 - this.ball.softBody.particles[0].y;
        this.ball.softBody.particles.forEach(p => {
          p.x += dx;
          p.y += dy;
        });
      }
    }
  }

  spawnBall() {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    this.particles = [];

    switch (this.activeSkin) {
      case 'green-apple':
        this.ball = new GreenAppleBall(cx, cy);
        this.hudBallName.textContent = "청사과 아삭 왁뿌";
        break;
      case 'butter-stick':
        this.ball = new ButterStickBall(cx, cy);
        this.hudBallName.textContent = "3레이어 버터 왁뿌";
        break;
      case 'mini-balloon':
        this.ball = new MiniBalloonBall(cx, cy);
        this.hudBallName.textContent = "크리스피 미니 왁볼";
        break;
      case 'choco-banana':
        this.ball = new ChocoBananaBall(cx, cy);
        this.hudBallName.textContent = "초코 바나나 왁뿌";
        break;
    }
    
    this.hudStatus.textContent = "준비 완료";
    this.hudStatus.className = "status-badge";
  }

  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    const updatePointer = (e, active) => {
      if (e.cancelable) e.preventDefault();
      
      if (!this.firstTouchOccurred) {
        audio.resume();
        this.firstTouchOccurred = true;
        this.guideOverlay.style.animationPlayState = 'running';
      }

      this.pointer.active = active;
      
      const rect = this.canvas.getBoundingClientRect();
      let clientX, clientY;
      
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      this.pointer.px = this.pointer.x;
      this.pointer.py = this.pointer.y;
      this.pointer.x = clientX - rect.left;
      this.pointer.y = clientY - rect.top;
    };

    this.canvas.addEventListener('mousedown', (e) => updatePointer(e, true), { passive: false });
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.pointer.active) updatePointer(e, true);
    }, { passive: false });
    
    const releasePointer = () => {
      this.pointer.active = false;
      if (this.ball && this.ball.stage === 2 && this.ball.softBody) {
        this.ball.softBody.update(this.pointer, this.canvas.width/window.devicePixelRatio, this.canvas.height/window.devicePixelRatio);
      }
    };
    
    window.addEventListener('mouseup', releasePointer);

    this.canvas.addEventListener('touchstart', (e) => updatePointer(e, true), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => updatePointer(e, true), { passive: false });
    window.addEventListener('touchend', releasePointer);
    window.addEventListener('touchcancel', releasePointer);

    this.btnAudio.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      if (isMuted) {
        this.btnAudio.classList.remove('active');
        document.getElementById('icon-audio-path').setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM19 12c0-3.13-1.86-5.83-4.57-7.05v2.19C16.43 8.24 17.8 9.97 17.8 12s-1.37 3.76-3.37 4.86v2.19c2.71-1.22 4.57-3.92 4.57-7.05zM3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z');
      } else {
        this.btnAudio.classList.add('active');
        document.getElementById('icon-audio-path').setAttribute('d', 'M12 2L6.5 7.5H2v9h4.5L12 22V2zm4.5 10c0-1.8-1-3.3-2.5-4.1v8.2c1.5-.8 2.5-2.3 2.5-4.1zm.5-6.5c2.3 1.5 4 4.1 4 7s-1.7 5.5-4 7v-1.6c1.4-1.2 2.4-3 2.4-5.4s-1-4.2-2.4-5.4V5.5z');
      }
    });

    this.btnHaptic.addEventListener('click', () => {
      this.hapticEnabled = !this.hapticEnabled;
      if (this.hapticEnabled) {
        this.btnHaptic.classList.add('active');
      } else {
        this.btnHaptic.classList.remove('active');
      }
    });

    this.btnReset.addEventListener('click', () => {
      this.spawnBall();
    });

    this.cards.forEach(card => {
      card.addEventListener('click', () => {
        this.cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        this.activeSkin = card.getAttribute('data-skin');
        this.spawnBall();
      });
    });
  }

  animate() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    
    this.ctx.clearRect(0, 0, w, h);

    if (this.ball) {
      this.ball.update(this.pointer, w, h, this.particles);
      this.ball.draw(this.ctx);
      
      if (this.ball.stage === 1) {
        this.hudStatus.textContent = "금이 감";
        this.hudStatus.className = "status-badge cracking";
      } else if (this.ball.stage === 2) {
        this.hudStatus.textContent = "반죽하기";
        this.hudStatus.className = "status-badge scrambled";
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(w, h);
      p.draw(this.ctx);
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.pointer.px = this.pointer.x;
    this.pointer.py = this.pointer.y;

    requestAnimationFrame(() => this.animate());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
