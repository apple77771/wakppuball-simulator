// ============================================================================
// 1. 고음질 물리 모델링 3D ASMR 오디오 합성 엔진 (Ultra-Hi-Fi Procedural Audio)
// ============================================================================
class AudioSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.buffers = {};
    this.loaded = false;
    this.activeSkin = 'green-apple';
    this.lastCrunchTime = 0;
    this.lastKneadTime = 0;
    
    this.activeSources = [];
    this.currentCrunch = null;
    this.currentKnead = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
      this.loadAudioFiles();
    }
  }

  async loadAudioFiles() {
    if (this.loaded) return;
    const files = {
      apple_crack_1: 'audio/apple_crack_1.mp3',
      apple_crack_2: 'audio/apple_crack_2.mp3',
      apple_knead_1: 'audio/apple_knead_1.mp3',
      apple_knead_2: 'audio/apple_knead_2.mp3',
      butter_crack_1: 'audio/butter_crack_1.mp3',
      butter_crack_2: 'audio/butter_crack_2.mp3',
      balloon_crack_1: 'audio/balloon_crack_1.mp3',
      balloon_crack_2: 'audio/balloon_crack_2.mp3',
      choco_crack_1: 'audio/choco_crack_1.mp3',
      choco_crack_2: 'audio/choco_crack_2.mp3',
      choco_knead_1: 'audio/choco_knead_1.mp3',
      choco_knead_2: 'audio/choco_knead_2.mp3'
    };

    for (const [name, path] of Object.entries(files)) {
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers[name] = audioBuffer;
      } catch (err) {
        console.error(`Failed to load audio file: ${path}`, err);
      }
    }
    this.loaded = true;
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

  createPanner(now, position) {
    if (!this.ctx) return null;

    const listener = this.ctx.listener;
    if (listener) {
      if (listener.positionX) {
        listener.positionX.setValueAtTime(0, now);
        listener.positionY.setValueAtTime(0, now);
        listener.positionZ.setValueAtTime(8, now);
        listener.forwardX.setValueAtTime(0, now);
        listener.forwardY.setValueAtTime(0, now);
        listener.forwardZ.setValueAtTime(-1, now);
        listener.upX.setValueAtTime(0, now);
        listener.upY.setValueAtTime(1, now);
        listener.upZ.setValueAtTime(0, now);
      } else {
        listener.setPosition(0, 0, 8);
        listener.setOrientation(0, 0, -1, 0, 1, 0);
      }
    }

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.0;
    panner.maxDistance = 100.0;
    panner.rolloffFactor = 1.0;

    if (position) {
      panner.positionX.setValueAtTime(position.x, now);
      panner.positionY.setValueAtTime(position.y, now);
      panner.positionZ.setValueAtTime(position.z, now);
    } else {
      panner.positionX.setValueAtTime(0, now);
      panner.positionY.setValueAtTime(0, now);
      panner.positionZ.setValueAtTime(0, now);
    }
    return panner;
  }

  playBuffer(bufferName, position = null, loop = false, pitch = 1.0, volume = 1.0) {
    if (this.muted || !this.ctx || !this.buffers[bufferName]) return null;
    this.resume();

    const now = this.ctx.currentTime;
    const panner = this.createPanner(now, position);

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers[bufferName];
    source.loop = loop;
    source.playbackRate.setValueAtTime(pitch, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 2.0, now);

    source.connect(gainNode);
    if (panner) {
      gainNode.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      gainNode.connect(this.ctx.destination);
    }

    source.start(now);

    const sourceObj = { source, gainNode };
    this.activeSources.push(sourceObj);

    source.onended = () => {
      const idx = this.activeSources.indexOf(sourceObj);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
    };

    return sourceObj;
  }

  stopAllSounds() {
    this.activeSources.forEach(s => {
      try {
        s.source.stop();
      } catch (e) {}
    });
    this.activeSources = [];
    this.currentCrunch = null;
    this.currentKnead = null;
  }

  playCrunch(type = 'apple', pitchMultiplier = 1.0, position = null) {
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (this.lastCrunchTime > 0 && (now - this.lastCrunchTime < 0.08)) return; // 80ms 딜레이로 단축
    this.lastCrunchTime = now;

    // 새로운 크랙음 재생 전 이전 크랙음 즉시 정지하여 중첩 방지
    if (this.currentCrunch) {
      try {
        this.currentCrunch.source.stop();
      } catch (e) {}
    }

    let mappedType = type;
    if (type === 'green-apple') mappedType = 'apple';
    if (type === 'butter-stick') mappedType = 'butter';
    if (type === 'mini-balloon') mappedType = 'balloon';
    if (type === 'choco-banana') mappedType = 'choco';

    const idx = Math.random() < 0.5 ? 1 : 2;
    const name = `${mappedType}_crack_${idx}`;
    const pitch = (0.95 + Math.random() * 0.1) * pitchMultiplier;
    this.currentCrunch = this.playBuffer(name, position, false, pitch, 1.15); // 볼륨을 1.15로 상향하여 타격감 증가
  }

  playPop(freq = 120, position = null) {
    let type = 'apple';
    if (this.activeSkin === 'green-apple') type = 'apple';
    else if (this.activeSkin === 'butter-stick') type = 'butter';
    else if (this.activeSkin === 'mini-balloon') type = 'balloon';
    else if (this.activeSkin === 'choco-banana') type = 'choco';

    const name = `${type}_crack_2`;
    this.playBuffer(name, position, false, 0.9, 1.25);
  }

  playSquelch(intensity = 0.5, position = null) {
    const now = this.ctx ? this.ctx.currentTime : 0;
    const throttle = Math.max(0.12, 0.4 - intensity * 0.22); 
    if (this.lastKneadTime > 0 && (now - this.lastKneadTime < throttle)) return;
    this.lastKneadTime = now;

    // 새로운 반죽음 재생 전 이전 반죽음 즉시 정지하여 중첩 방지
    if (this.currentKnead) {
      try {
        this.currentKnead.source.stop();
      } catch (e) {}
    }

    let type = 'apple';
    if (this.activeSkin === 'green-apple') type = 'apple';
    else if (this.activeSkin === 'butter-stick') type = 'choco'; 
    else if (this.activeSkin === 'mini-balloon') type = 'apple'; 
    else if (this.activeSkin === 'choco-banana') type = 'choco';

    const idx = Math.random() < 0.5 ? 1 : 2;
    const name = `${type}_knead_${idx}`;
    const volume = Math.min(1.0, 0.25 + intensity * 0.75);
    const pitch = 0.88 + Math.random() * 0.24;
    this.currentKnead = this.playBuffer(name, position, false, pitch, volume);
  }

  playMiniPop(position = null) {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const panner = this.createPanner(now, position);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.9, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gainNode);
    if (panner) {
      gainNode.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      gainNode.connect(this.ctx.destination);
    }

    osc.start(now);
    osc.stop(now + 0.11);
  }

  playBeadTap(position = null) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const panner = this.createPanner(now, position);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750 + Math.random() * 250, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.025);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      gain.connect(this.ctx.destination);
    }
    osc.start(now);
    osc.stop(now + 0.03);
  }

  playSlap(intensity = 0.5, position = null) {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const panner = this.createPanner(now, position);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.06);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.3 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.ctx.destination);
    } else {
      gain.connect(this.ctx.destination);
    }

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
    slapFilter.frequency.setValueAtTime(380, now); 
    slapFilter.Q.setValueAtTime(2, now);

    const slapGain = this.ctx.createGain();
    slapGain.gain.setValueAtTime(0.8 * intensity, now);
    slapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    slapSource.connect(slapFilter);
    slapFilter.connect(slapGain);
    if (panner) {
      slapGain.connect(panner);
    } else {
      slapGain.connect(this.ctx.destination);
    }

    osc.start(now);
    osc.stop(now + 0.07);
    slapSource.start(now);
    slapSource.stop(now + 0.06);
  }
}

const audio = new AudioSynth();


// ============================================================================
// 2. 3D 입자 물리 시스템 (3D Physical Debris Particles)
// ============================================================================
class Particle3D {
  constructor(scene, pos, color, size, type = 'normal', launchVel = null) {
    this.scene = scene;
    this.type = type;
    this.color = color;
    this.size = size;

    let geo;
    if (type === 'apple') {
      geo = new THREE.BoxGeometry(size * 1.6, size * 0.8, size * 0.4);
    } else if (type === 'star') {
      geo = new THREE.ConeGeometry(size, size * 1.5, 4);
    } else if (type === 'flake') {
      geo = new THREE.BoxGeometry(size * 1.4, size * 1.4, size * 0.15);
    } else {
      // 왁스 껍질 느낌의 얇은 파편 조각 형태 기하구조
      geo = new THREE.BoxGeometry(size * (1.0 + Math.random() * 0.8), size * (0.8 + Math.random() * 0.6), size * 0.2);
    }

    let mat;
    if (type === 'apple') {
      mat = new THREE.MeshStandardMaterial({ color: 0xf87171, roughness: 0.3 }); 
    } else if (type === 'star') {
      mat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.1, metalness: 0.8 }); 
    } else {
      mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.1 });
    }

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(pos);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    if (launchVel) {
      this.vx = launchVel.x;
      this.vy = launchVel.y;
      this.vz = launchVel.z;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.5;
      this.vx = Math.cos(angle) * speed * 0.7;
      this.vy = 3.0 + Math.random() * 5.0; 
      this.vz = (Math.random() - 0.5) * speed * 0.7;
    }

    this.gravity = -0.22;
    this.friction = 0.97;
    this.bounce = 0.45;
    this.life = 1.0;
    this.decay = 0.012 + Math.random() * 0.016;

    this.mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    this.vRot = new THREE.Vector3(
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.15
    );
  }

  update() {
    this.vy += this.gravity;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vz *= this.friction;

    this.mesh.position.x += this.vx * 0.05;
    this.mesh.position.y += this.vy * 0.05;
    this.mesh.position.z += this.vz * 0.05;

    this.mesh.rotation.x += this.vRot.x;
    this.mesh.rotation.y += this.vRot.y;
    this.mesh.rotation.z += this.vRot.z;

    this.life -= this.decay;
    const scale = Math.max(0.001, this.life);
    this.mesh.scale.set(scale, scale, scale);

    if (this.mesh.position.y < -3.2) {
      this.mesh.position.y = -3.2;
      this.vy = -this.vy * this.bounce;
      this.vx *= 0.6;
      this.vz *= 0.6;
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}


// ============================================================================
// 3. 3차원 탄성 질점-스프링 소프트바디 반죽 엔진 (3D Soft-Body Physics)
// ============================================================================
class SoftBodyParticle3D {
  constructor(x, y, z) {
    this.pos = new THREE.Vector3(x, y, z);
    this.originalPos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.force = new THREE.Vector3();
  }
}

class SoftBody3D {
  constructor(scene, shapeType, radius, color, shardColor, shardCount, toppings = []) {
    this.scene = scene;
    this.radius = radius;
    this.color = color;
    this.shardColor = shardColor;
    
    this.particles = [];
    this.springs = [];
    this.toppingsList = [];

    this.kCenter = 0.015; 
    this.kEdge = 0.28;    
    this.damping = 0.64;  
    this.gravity = 0.0; 

    this.draggedParticleIdx = -1;

    this.meltShards = false;
    this.baseColor = color;
    this.targetColor = color;
    this.shardsOpacity = 1.0;

    this.init(shapeType, radius);
    this.initToppings(shardCount, toppings);
  }

  init(shapeType, r) {
    if (shapeType === 'box') {
      this.geometry = new THREE.BoxGeometry(2.2, 0.9, 0.9, 5, 2, 2);
    } else {
      this.geometry = new THREE.SphereGeometry(r, 12, 10);
    }
    
    if (this.color === '#ffffff' || this.color === '#e2f5d3') {
      // 청사과 점토: 벨벳 느낌의 보송한 점토 질감
      this.material = new THREE.MeshPhysicalMaterial({
        color: this.color,
        roughness: 0.8,
        metalness: 0.0,
        sheen: new THREE.Color(0xffffff),
        sheenRoughness: 0.5,
        transparent: true,
        opacity: 1.0
      });
    } else if (this.color === '#ffe082') {
      // 버터 점토: 약간 윤기 나는 크리미한 질감
      this.material = new THREE.MeshPhysicalMaterial({
        color: this.color,
        roughness: 0.4,
        metalness: 0.0,
        clearcoat: 0.2,
        clearcoatRoughness: 0.3,
        transparent: true,
        opacity: 1.0
      });
    } else if (this.color === '#e0f7fa') {
      // 크리스피 미니: 물광 젤리 같은 반투명한 질감
      this.material = new THREE.MeshPhysicalMaterial({
        color: this.color,
        roughness: 0.12,
        metalness: 0.02,
        transmission: 0.85,
        ior: 1.33,
        thickness: 0.5,
        transparent: true,
        opacity: 0.8
      });
    } else if (this.color === '#ffd54f' || this.color === '#bcaaa4') {
      // 초코바나나 점토: 끈적한 바나나 머드 질감
      this.material = new THREE.MeshPhysicalMaterial({
        color: this.color,
        roughness: 0.7,
        metalness: 0.0,
        sheen: new THREE.Color(0xffffff),
        sheenRoughness: 0.4,
        transparent: true,
        opacity: 1.0
      });
    } else {
      this.material = new THREE.MeshStandardMaterial({
        color: this.color,
        roughness: 0.22,
        metalness: 0.02,
        transparent: true,
        opacity: 1.0
      });
    }

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    const posAttr = this.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const pz = posAttr.getZ(i);
      this.particles.push(new SoftBodyParticle3D(px, py, pz));
    }

    const index = this.geometry.index;
    const addSpring = (i1, i2) => {
      if (this.springs.some(s => (s.i1 === i1 && s.i2 === i2) || (s.i1 === i2 && s.i2 === i1))) return;
      const p1 = this.particles[i1];
      const p2 = this.particles[i2];
      const restLength = p1.originalPos.distanceTo(p2.originalPos);
      this.springs.push({ i1, i2, restLength });
    };

    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const a = index.array[i];
        const b = index.array[i+1];
        const c = index.array[i+2];
        addSpring(a, b);
        addSpring(b, c);
        addSpring(c, a);
      }
    } else {
      for (let i = 0; i < posAttr.count; i += 3) {
        addSpring(i, i+1);
        addSpring(i+1, i+2);
        addSpring(i+2, i);
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dist = this.particles[i].originalPos.distanceTo(this.particles[j].originalPos);
        if (dist > r * 1.5) {
          this.springs.push({ i1: i, i2: j, restLength: dist * 0.95, isCross: true });
        }
      }
    }
  }

  initToppings(count, toppings) {
    for (let i = 0; i < count; i++) {
      const pIdx = Math.floor(Math.random() * this.particles.length);
      const toppingType = toppings.length > 0 ? toppings[Math.floor(Math.random() * toppings.length)] : 'normal';

      let size = 0.12 + Math.random() * 0.15;
      let geo;
      if (toppingType === 'apple') {
        geo = new THREE.BoxGeometry(size * 1.5, size * 0.8, size * 0.3);
      } else if (toppingType === 'star') {
        geo = new THREE.ConeGeometry(size, size * 1.4, 4);
      } else if (toppingType === 'flake') {
        geo = new THREE.BoxGeometry(size * (1.5 + Math.random() * 0.8), size * (1.5 + Math.random() * 0.8), 0.04);
      } else {
        // 실제 껍데기가 깨져 밀착된 파편 느낌을 주기 위해 넓고 얇은 평면 기하구조 적용
        geo = new THREE.BoxGeometry(size * (1.8 + Math.random() * 1.4), size * (1.4 + Math.random() * 1.0), size * 0.15);
      }

      let color = Array.isArray(this.shardColor) ? this.shardColor[Math.floor(Math.random() * this.shardColor.length)] : this.shardColor;
      let mat;
      if (toppingType === 'apple') {
        mat = new THREE.MeshStandardMaterial({ color: 0xf87171, roughness: 0.3 }); 
      } else if (toppingType === 'star') {
        mat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.1, metalness: 0.8 }); 
      } else if (toppingType === 'flake') {
        mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
      } else {
        mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4 });
      }

      const topMesh = new THREE.Mesh(geo, mat);
      topMesh.castShadow = true;
      this.scene.add(topMesh);

      this.toppingsList.push({
        mesh: topMesh,
        pIndex: pIdx,
        offsetDir: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize().multiplyScalar(0.05),
        rotOffset: new THREE.Vector3(Math.random()*6, Math.random()*6, Math.random()*6),
        originalSize: size
      });
    }
  }

  update(pointer, raycaster, targetPos) {
    const points = this.particles.length;

    if (pointer.active) {
      if (this.draggedParticleIdx === -1) {
        const intersects = raycaster.intersectObject(this.mesh);
        if (intersects.length > 0) {
          const hitPt = intersects[0].point;
          let nearestDist = Infinity;
          for (let i = 0; i < points; i++) {
            const dist = this.particles[i].pos.distanceTo(hitPt);
            if (dist < nearestDist) {
              nearestDist = dist;
              this.draggedParticleIdx = i;
            }
          }
        }
      }

      if (this.draggedParticleIdx !== -1) {
        const target = this.particles[this.draggedParticleIdx];
        const prevPos = target.pos.clone();
        target.pos.copy(targetPos);
        target.vel.set(0, 0, 0);

        const dragSpeed = prevPos.distanceTo(targetPos) * 20.0;
        if (dragSpeed > 1.8) {
          audio.playSquelch(dragSpeed * 0.16, target.pos);
          if (navigator.vibrate && Math.random() < 0.18) {
            navigator.vibrate(6);
          }


        }
      }
    } else {
      if (this.draggedParticleIdx !== -1) {
        const draggedP = this.particles[this.draggedParticleIdx];
        const distFromCenter = draggedP.pos.length(); 
        
        if (distFromCenter > this.radius * 1.35) {
          audio.playSlap(Math.min(distFromCenter / (this.radius * 1.8), 1.0), draggedP.pos); 
          if (navigator.vibrate) navigator.vibrate(15);
        }
        this.draggedParticleIdx = -1;
      }
    }

    this.particles.forEach(p => p.force.set(0, 0, 0));

    let dragOffset = new THREE.Vector3();
    let dragP = null;
    if (pointer.active && this.draggedParticleIdx !== -1) {
      dragP = this.particles[this.draggedParticleIdx];
      dragOffset.copy(dragP.pos).sub(dragP.originalPos);
    }

    this.particles.forEach((p, idx) => {
      // 드래그 방향으로 중심 복원점(targetCenter)을 당겨 점성 찌그러짐 표현
      const targetCenter = new THREE.Vector3(0, 0, 0);
      if (dragP) {
        const distToDrag = p.originalPos.distanceTo(dragP.originalPos);
        const weight = Math.exp(-distToDrag * 0.7); // 드래그 부위와 가까운 정점들 위주로 변형
        targetCenter.addScaledVector(dragOffset, weight * 0.48);
      }

      const d = p.pos.clone().sub(targetCenter);
      const dist = d.length();
      const rest = p.originalPos.length();
      if (dist > 0.01) {
        const diff = dist - rest;
        const f = d.normalize().multiplyScalar(-diff * this.kCenter);
        p.force.add(f);
      }
    });

    this.springs.forEach(s => {
      const p1 = this.particles[s.i1];
      const p2 = this.particles[s.i2];
      const d = p2.pos.clone().sub(p1.pos);
      const dist = d.length();
      if (dist > 0.01) {
        const diff = dist - s.restLength;
        const k = s.isCross ? 0.03 : this.kEdge;
        const f = d.normalize().multiplyScalar(diff * k);
        p1.force.add(f);
        p2.force.sub(f);
      }
    });

    for (let i = 0; i < points; i++) {
      if (pointer.active && i === this.draggedParticleIdx) continue;

      const p = this.particles[i];
      p.force.y += this.gravity; 
      
      p.vel.add(p.force);
      p.vel.multiplyScalar(this.damping);
      p.pos.add(p.vel);

      if (p.pos.y < -3.1) { p.pos.y = -3.1; p.vel.y = 0; }
      if (p.pos.y > 3.1)  { p.pos.y = 3.1;  p.vel.y = 0; }
      if (p.pos.x < -4.0) { p.pos.x = -4.0; p.vel.x = 0; }
      if (p.pos.x > 4.0)  { p.pos.x = 4.0;  p.vel.x = 0; }
      if (p.pos.z < -2.0) { p.pos.z = -2.0; p.vel.z = 0; }
      if (p.pos.z > 2.0)  { p.pos.z = 2.0;  p.vel.z = 0; }
    }

    const posAttr = this.geometry.attributes.position;
    for (let i = 0; i < points; i++) {
      posAttr.setXYZ(i, this.particles[i].pos.x, this.particles[i].pos.y, this.particles[i].pos.z);
    }
    posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    this.toppingsList.forEach(t => {
      const p = this.particles[t.pIndex];
      t.mesh.position.copy(p.pos).add(t.offsetDir);
      t.mesh.rotation.set(t.rotOffset.x, t.rotOffset.y, t.rotOffset.z);
    });
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();

    this.toppingsList.forEach(t => {
      this.scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
    });
  }
}


// ============================================================================
// 4. 3D 왁뿌볼 종류별 시뮬레이션 클래스군 (3D Ball Classes)
// ============================================================================

// ----------------------------------------------------------------------------
// 스킨 1. 청사과 아삭 왁뿌 (3D Green Apple)
// ----------------------------------------------------------------------------
class GreenAppleBall {
  constructor(scene) {
    this.scene = scene;
    this.name = "청사과 아삭 왁뿌";
    this.r = 1.6;
    
    this.stage = 0;
    this.pressure = 0.0;
    this.deformX = 0;
    this.deformY = 0;
    
    this.hasGeneratedCracks = false;
    this.crackBranches = [];
    this.lastPlayedPressure = 0.0;
    this.softBody = null;
    this.initMeshes();
  }

  initMeshes() {
    this.group = new THREE.Group();

    const shellGeo = new THREE.SphereGeometry(this.r, 32, 32);
    // 오가닉한 왁스 질감을 위해 구 정점에 불규칙한 엠보싱 노이즈 가산
    const posAttr = shellGeo.attributes.position;
    const normalAttr = shellGeo.attributes.normal;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const nx = normalAttr.getX(i);
      const ny = normalAttr.getY(i);
      const nz = normalAttr.getZ(i);
      const noise = (Math.sin(x * 3.5) * Math.cos(y * 3.5) * Math.sin(z * 3.5)) * 0.022;
      posAttr.setXYZ(i, x + nx * noise, y + ny * noise, z + nz * noise);
    }
    shellGeo.computeVertexNormals();

    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x76ff03,
      roughness: 0.15,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });
    this.shellMesh = new THREE.Mesh(shellGeo, shellMat);
    this.shellMesh.castShadow = true;
    this.group.add(this.shellMesh);

    this.decorations = [];
    for(let i=0; i<8; i++) {
      const isStar = Math.random() < 0.5;
      const decGeo = isStar ? new THREE.ConeGeometry(0.12, 0.18, 4) : new THREE.BoxGeometry(0.18, 0.12, 0.06);
      const decMat = new THREE.MeshStandardMaterial({
        color: isStar ? 0xfbbf24 : 0xf87171,
        roughness: 0.2
      });
      const decMesh = new THREE.Mesh(decGeo, decMat);
      
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI;
      decMesh.position.set(
        Math.cos(angle1) * Math.sin(angle2) * this.r,
        Math.sin(angle1) * Math.sin(angle2) * this.r,
        Math.cos(angle2) * this.r
      );
      decMesh.rotation.set(Math.random()*6, Math.random()*6, Math.random()*6);
      this.group.add(decMesh);
      this.decorations.push(decMesh);
    }

    this.crackGroup = new THREE.Group();
    this.crackGroup.visible = false;
    this.group.add(this.crackGroup);

    this.scene.add(this.group);
  }

  generateCracks(localHitPoint) {
    this.crackGroup.clear();
    this.crackBranches = [];

    const crackMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2.5,
      transparent: true,
      opacity: 0.95
    });

    const numBranches = 8;
    const normal = localHitPoint.clone().normalize();
    let tangent = new THREE.Vector3(0, 1, 0).cross(normal);
    if (tangent.lengthSq() < 0.01) {
      tangent = new THREE.Vector3(1, 0, 0).cross(normal);
    }
    tangent.normalize();
    const binormal = normal.clone().cross(tangent).normalize();

    for (let i = 0; i < numBranches; i++) {
      const angle = (i / numBranches) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const dir = tangent.clone().multiplyScalar(Math.cos(angle)).add(binormal.clone().multiplyScalar(Math.sin(angle))).normalize();
      
      const points = [];
      let currentPt = localHitPoint.clone().normalize().multiplyScalar(this.r + 0.015);
      points.push(currentPt.clone());

      const numSteps = 15;
      const stepSize = (this.r * Math.PI * 0.75) / numSteps;

      for (let step = 1; step <= numSteps; step++) {
        const nextPt = currentPt.clone().addScaledVector(dir, stepSize);
        const jitterDir = normal.clone().cross(dir).normalize();
        nextPt.addScaledVector(jitterDir, (Math.random() - 0.5) * stepSize * 0.4);
        nextPt.normalize().multiplyScalar(this.r + 0.015);
        
        points.push(nextPt.clone());
        currentPt = nextPt;
        dir.copy(nextPt).sub(points[points.length - 2]).normalize();
      }

      const crackGeo = new THREE.BufferGeometry().setFromPoints(points);
      const crackLine = new THREE.Line(crackGeo, crackMat);
      this.crackGroup.add(crackLine);
      this.crackBranches.push({
        line: crackLine,
        points: points
      });
    }
  }

  update(pointer, raycaster, targetPos, particles, isFrozen = false) {
    if (this.stage === 2) {
      if (this.softBody) this.softBody.update(pointer, raycaster, targetPos);
      return;
    }

    const intersects = raycaster.intersectObject(this.shellMesh);

    if (pointer.active && intersects.length > 0) {
      const hitPt = intersects[0].point;
      this.deformX = hitPt.x * 0.12;
      this.deformY = hitPt.y * 0.12;
      this.group.position.set(this.deformX, this.deformY, 0);

      const dragSpeed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
      this.pressure += (0.002 + dragSpeed * 0.0004) * (isFrozen ? 1.55 : 1.0);
      
      // 클릭 즉시 방사형 크랙 생성
      if (!this.hasGeneratedCracks) {
        const localHit = this.shellMesh.worldToLocal(hitPt.clone());
        this.generateCracks(localHit);
        this.hasGeneratedCracks = true;
      }

      if (this.pressure > 0.05) {
        this.stage = 1;
        this.crackGroup.visible = true;
        this.crackGroup.scale.setScalar(1.0 + this.pressure * 0.012);
        
        // 크랙 방사형 번짐 애니메이션
        const propFactor = Math.max(0, Math.min(1.0, (this.pressure - 0.05) / 0.85));
        this.crackBranches.forEach(branch => {
          const totalPoints = branch.points.length;
          const drawCount = Math.floor(propFactor * totalPoints);
          branch.line.geometry.setDrawRange(0, drawCount);
        });
      }

      // 압력에 따른 Y축 짓눌림 및 X/Z축 팽창 스케일링
      const squash = 1.0 - (this.pressure * 0.16);
      const stretch = 1.0 + (this.pressure * 0.06);
      this.group.scale.set(stretch, squash, stretch);

      // 즉각적인 소리 피드백: 첫 터치 시 100% 재생, 압력 증가에 따라 주기적 재생, 그리고 무작위 드래그 재생
      let shouldPlayCrunch = pointer.justPressed;
      if (this.pressure - this.lastPlayedPressure > 0.08) {
        shouldPlayCrunch = true;
        this.lastPlayedPressure = this.pressure;
      }
      if (Math.random() < 0.12) {
        shouldPlayCrunch = true;
      }

      if (shouldPlayCrunch) {
        const pitch = (isFrozen ? 1.2 : 1.0);
        audio.playCrunch('apple', pitch, hitPt); 
        if (navigator.vibrate) navigator.vibrate(isFrozen ? 12 : 8);
        particles.push(new Particle3D(this.scene, hitPt, '#76ff03', (0.04 + Math.random()*0.05)*(isFrozen ? 0.65 : 1.0)));
      }

      if (this.pressure >= 1.0) {
        this.explode(particles, isFrozen);
      }
    } else {
      this.deformX *= 0.82;
      this.deformY *= 0.82;
      this.group.position.set(this.deformX, this.deformY, 0);
      this.lastPlayedPressure = this.pressure; // 릴리즈 시 다음 터치 즉시 소리 유도

      // 탄성 복원 스케일
      this.group.scale.x += (1.0 - this.group.scale.x) * 0.18;
      this.group.scale.y += (1.0 - this.group.scale.y) * 0.18;
      this.group.scale.z += (1.0 - this.group.scale.z) * 0.18;
    }
  }

  explode(particles, isFrozen = false) {
    this.stage = 2;
    this.pressure = 1.0;
    
    audio.playPop(isFrozen ? 200 : 170, this.group.position);
    if (navigator.vibrate) navigator.vibrate(isFrozen ? [40, 80, 150] : [30, 60, 120]);

    const pos = this.group.position.clone();
    
    // 냉동 여부에 따른 파편 물리 파라미터 튜닝
    const count = isFrozen ? 55 : 32;
    const speedMult = isFrozen ? 1.5 : 1.0;
    const sizeMult = isFrozen ? 0.65 : 1.0;

    for (let i = 0; i < count; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * this.r,
        (Math.random() - 0.5) * this.r,
        (Math.random() - 0.5) * this.r
      );
      const partPos = pos.clone().add(offset);
      
      // 방사형 발사 물리 연산
      const radialDir = offset.clone().normalize();
      const speed = (2.5 + Math.random() * 4.8) * speedMult;
      const launchVel = radialDir.multiplyScalar(speed);
      launchVel.y += 2.0; // 분수처럼 상방 상승 가산

      const shardSize = (0.05 + Math.random() * 0.07) * sizeMult;
      particles.push(new Particle3D(this.scene, partPos, '#76ff03', shardSize, 'normal', launchVel));

      if (Math.random() < 0.35) {
        const appleVel = launchVel.clone().multiplyScalar(0.85);
        particles.push(new Particle3D(this.scene, partPos, '#ff3366', (0.07 + Math.random() * 0.04) * sizeMult, 'apple', appleVel));
      }
      if (Math.random() < 0.45) {
        const starVel = launchVel.clone().multiplyScalar(0.9);
        particles.push(new Particle3D(this.scene, partPos, '#ffd700', (0.06 + Math.random() * 0.05) * sizeMult, 'star', starVel));
      }
    }

    this.scene.remove(this.group);
    
    this.softBody = new SoftBody3D(this.scene, 'sphere', this.r * 1.05, '#ffffff', ['#76ff03', '#ccff90'], 16, ['normal', 'apple', 'star']);
    this.softBody.meltShards = true;
    this.softBody.targetColor = '#e2f5d3'; 
  }

  destroy() {
    if (this.softBody) {
      this.softBody.destroy();
    } else {
      this.scene.remove(this.group);
      this.shellMesh.geometry.dispose();
      this.shellMesh.material.dispose();
      this.decorations.forEach(d => {
        d.geometry.dispose();
        d.material.dispose();
      });
      this.crackGroup.children.forEach(c => {
        c.geometry.dispose();
        c.material.dispose();
      });
    }
  }
}

// ----------------------------------------------------------------------------
// 스킨 2. 3레이어 버터 왁뿌 (3D 3-Layer Butter Stick)
// ----------------------------------------------------------------------------
class ButterStickBall {
  constructor(scene) {
    this.scene = scene;
    this.name = "3레이어 버터 왁뿌";
    this.w = 2.4;
    this.h = 1.0;
    this.d = 1.0;
    
    this.stage = 0;
    this.pressure = 0.0;
    this.deformY = 0;
    this.lastPlayedPressure = 0.0;
    this.softBody = null;
    this.flakes = [];
    this.initMeshes();
  }

  initMeshes() {
    this.group = new THREE.Group();

    const butterGeo = new THREE.BoxGeometry(this.w, this.h, this.d);
    const butterMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      roughness: 0.45,
      metalness: 0.02
    });
    this.butterMesh = new THREE.Mesh(butterGeo, butterMat);
    this.butterMesh.castShadow = true;
    this.butterMesh.receiveShadow = true;
    this.group.add(this.butterMesh);

    const cols = 6;
    const rows = 3;
    const fw = this.w / cols;
    const fh = this.h / rows;
    const startX = -this.w / 2;
    const startY = -this.h / 2;

    const flakeGeo = new THREE.BoxGeometry(fw * 0.95, fh * 0.95, 0.08);
    // 석고 조각 질감 향상: 울퉁불퉁한 표면 표현
    const fPos = flakeGeo.attributes.position;
    for (let i = 0; i < fPos.count; i++) {
      const z = fPos.getZ(i);
      if (Math.abs(z) > 0.01) {
        const x = fPos.getX(i);
        const y = fPos.getY(i);
        fPos.setZ(i, z + (Math.sin(x*10) * Math.cos(y*10)) * 0.015);
      }
    }
    flakeGeo.computeVertexNormals();

    const flakeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf5f5f5,
      roughness: 0.95,
      metalness: 0.0,
      clearcoat: 0.0
    });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const fMesh = new THREE.Mesh(flakeGeo, flakeMat);
        fMesh.position.set(
          startX + c * fw + fw / 2,
          startY + r * fh + fh / 2,
          this.d / 2 + 0.03
        );
        this.group.add(fMesh);
        this.flakes.push({ mesh: fMesh, alive: true, health: 3 });
        
        const fMeshB = new THREE.Mesh(flakeGeo, flakeMat);
        fMeshB.position.set(
          startX + c * fw + fw / 2,
          startY + r * fh + fh / 2,
          -this.d / 2 - 0.03
        );
        this.group.add(fMeshB);
        this.flakes.push({ mesh: fMeshB, alive: true, health: 3 });
      }
    }

    this.scene.add(this.group);
  }

  update(pointer, raycaster, targetPos, particles, isFrozen = false) {
    if (this.stage === 2) {
      if (this.softBody) this.softBody.update(pointer, raycaster, targetPos);
      return;
    }

    let peeledSomething = false;
    let hitPt = null;

    if (pointer.active) {
      const intersects = raycaster.intersectObjects(this.flakes.filter(f => f.alive).map(f => f.mesh));
      if (intersects.length > 0) {
        const hitFlake = intersects[0].object;
        hitPt = intersects[0].point;

        const dragSpeed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
        this.pressure += (0.0025 + dragSpeed * 0.0005) * (isFrozen ? 1.55 : 1.0);
        if (this.pressure > 1.0) this.pressure = 1.0;

        // 압력에 따른 Y축 짓눌림 및 X/Z축 팽창 스케일링
        const squash = 1.0 - (this.pressure * 0.15);
        const stretch = 1.0 + (this.pressure * 0.06);
        this.group.scale.set(stretch, squash, stretch);

        // 터치 즉시 혹은 압력 8% 증가 시마다 소리 트리거
        if (pointer.justPressed || (this.pressure - this.lastPlayedPressure > 0.08)) {
          peeledSomething = true;
          this.lastPlayedPressure = this.pressure;
        }

        const targetData = this.flakes.find(f => f.mesh === hitFlake);
        if (targetData) {
          const speed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
          if (pointer.justPressed || Math.random() < 0.4 || speed > 1.2) {
            targetData.health -= 1;
            peeledSomething = true;

            // 얇은 플레이크 형태 파편 비산
            const shardSize = (0.025 + Math.random()*0.02) * (isFrozen ? 0.7 : 1.0);
            particles.push(new Particle3D(this.scene, hitPt, '#ffffff', shardSize, 'flake'));

            if (targetData.health <= 0) {
              targetData.alive = false;
              this.group.remove(hitFlake);
              
              const burstCount = isFrozen ? 6 : 3;
              for(let i=0; i<burstCount; i++) {
                const flakeSize = (0.04 + Math.random()*0.04) * (isFrozen ? 0.7 : 1.0);
                particles.push(new Particle3D(this.scene, hitPt, '#ffffff', flakeSize, 'flake'));
              }
            } else {
              hitFlake.material.color.setHex(0xdddddd);
              hitFlake.position.z += (Math.random() - 0.5) * 0.015;
            }
          }
        }
      }
    } else {
      this.pressure *= 0.85; // 압력 서서히 해제
      this.lastPlayedPressure = this.pressure; // 릴리즈 시 다음 터치 즉시 소리 유도
      // 탄성 복원 스케일
      this.group.scale.x += (1.0 - this.group.scale.x) * 0.18;
      this.group.scale.y += (1.0 - this.group.scale.y) * 0.18;
      this.group.scale.z += (1.0 - this.group.scale.z) * 0.18;
    }

    if (peeledSomething) {
      this.stage = 1;
      const pitch = isFrozen ? 0.85 : 0.7;
      audio.playCrunch('butter', pitch, hitPt); 
      if (navigator.vibrate) navigator.vibrate(isFrozen ? 10 : 7);

      const aliveCount = this.flakes.filter(f => f.alive).length;
      if (aliveCount / this.flakes.length <= 0.3) {
        this.explode(particles, isFrozen);
      }
    }
  }

  explode(particles, isFrozen = false) {
    this.stage = 2;
    const pos = this.group.position.clone();
    audio.playPop(isFrozen ? 140 : 115, pos);
    if (navigator.vibrate) navigator.vibrate(isFrozen ? [40, 60, 110] : [35, 45, 80]);

    const speedMult = isFrozen ? 1.5 : 1.0;
    const sizeMult = isFrozen ? 0.7 : 1.0;

    this.flakes.forEach(f => {
      if (f.alive) {
        this.group.remove(f.mesh);
        
        // 방사형 발사 속도 벡터 계산
        const fPos = f.mesh.position.clone();
        const radialDir = fPos.clone().normalize();
        const speed = (2.0 + Math.random() * 4.0) * speedMult;
        const launchVel = radialDir.multiplyScalar(speed);
        launchVel.y += 1.5; // 상방 상승 추가

        const flakeSize = (0.06 + Math.random()*0.05) * sizeMult;
        particles.push(new Particle3D(this.scene, fPos.add(pos), '#ffffff', flakeSize, 'flake', launchVel));
      }
    });

    this.scene.remove(this.group);
    this.softBody = new SoftBody3D(this.scene, 'box', 0.8, '#ffe082', '#ffffff', 18, ['flake']);
  }

  destroy() {
    if (this.softBody) {
      this.softBody.destroy();
    } else {
      this.scene.remove(this.group);
      this.butterMesh.geometry.dispose();
      this.butterMesh.material.dispose();
      this.flakes.forEach(f => {
        f.mesh.geometry.dispose();
        f.mesh.material.dispose();
      });
    }
  }
}

// ----------------------------------------------------------------------------
// 스킨 3. 크리스피 미니 왁볼 (3D Crispy Mini Balloon)
// ----------------------------------------------------------------------------
class MiniWaxBead3D {
  constructor(pos, r, color) {
    this.pos = pos.clone();
    this.originalPos = pos.clone();
    this.r = r;
    this.color = color;
    
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;
    this.vz = (Math.random() - 0.5) * 1.5;
    
    this.stage = 0;
    this.pressure = 0;
  }
}

class MiniBalloonBall {
  constructor(scene) {
    this.scene = scene;
    this.name = "크리스피 미니 왁볼";
    this.r = 1.7;
    
    this.stage = 0;
    this.pressure = 0.0;
    this.deformX = 0;
    this.deformY = 0;
    this.lastPlayedPressure = 0.0;
    this.softBody = null;

    this.beadData = [
      new MiniWaxBead3D(new THREE.Vector3(-0.4, 0.3, 0.1), 0.35, '#f06292'),
      new MiniWaxBead3D(new THREE.Vector3(0.5, 0.1, -0.2), 0.37, '#4dd0e1'),
      new MiniWaxBead3D(new THREE.Vector3(-0.1, -0.4, 0.2), 0.36, '#fff176')
    ];

    this.initMeshes();
  }

  initMeshes() {
    this.group = new THREE.Group();

    const balloonGeo = new THREE.SphereGeometry(this.r, 32, 32);
    this.balloonMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.02,
      metalness: 0.0,
      transmission: 0.98,
      ior: 1.45,
      thickness: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });
    this.balloonMesh = new THREE.Mesh(balloonGeo, this.balloonMat);
    this.group.add(this.balloonMesh);

    this.beads = [];
    const beadGeo = new THREE.SphereGeometry(1.0, 16, 16);
    this.beadData.forEach(bd => {
      const beadMat = new THREE.MeshPhysicalMaterial({
        color: bd.color,
        roughness: 0.1,
        metalness: 0.0,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1
      });
      const bMesh = new THREE.Mesh(beadGeo, beadMat);
      bMesh.scale.setScalar(bd.r);
      bMesh.position.copy(bd.pos);
      this.group.add(bMesh);
      this.beads.push({ mesh: bMesh, data: bd });
    });

    this.scene.add(this.group);
  }

  update(pointer, raycaster, targetPos, particles, isFrozen = false) {
    if (this.stage === 2) {
      if (this.softBody) this.softBody.update(pointer, raycaster, targetPos);
      return;
    }

    for (let i = 0; i < this.beads.length; i++) {
      const b = this.beads[i];
      if (b.data.stage === 2) continue;

      b.data.vx *= 0.98;
      b.data.vy *= 0.98;
      b.data.vz *= 0.98;

      b.data.pos.x += b.data.vx * 0.05;
      b.data.pos.y += b.data.vy * 0.05;
      b.data.pos.z += b.data.vz * 0.05;

      const dist = b.data.pos.length();
      const limit = this.r - b.data.r - 0.08;
      if (dist > limit) {
        b.data.pos.normalize().multiplyScalar(limit);
        
        const normal = b.data.pos.clone().normalize();
        const velocity = new THREE.Vector3(b.data.vx, b.data.vy, b.data.vz);
        const bounceVec = velocity.clone().sub(normal.clone().multiplyScalar(velocity.dot(normal) * 2.0));
        b.data.vx = bounceVec.x * 0.75;
        b.data.vy = bounceVec.y * 0.75;
        b.data.vz = bounceVec.z * 0.75;
        
        if (Math.hypot(b.data.vx, b.data.vy) > 0.4) {
          audio.playBeadTap(b.data.pos.clone().add(this.group.position));
        }
      }

      for (let j = i + 1; j < this.beads.length; j++) {
        const other = this.beads[j];
        if (other.data.stage === 2) continue;

        const delta = other.data.pos.clone().sub(b.data.pos);
        const bDist = delta.length();
        const minDist = b.data.r + other.data.r;

        if (bDist < minDist) {
          const overlap = minDist - bDist;
          const normal = delta.normalize();

          b.data.pos.addScaledVector(normal, -overlap * 0.5);
          other.data.pos.addScaledVector(normal, overlap * 0.5);

          const v1 = new THREE.Vector3(b.data.vx, b.data.vy, b.data.vz);
          const v2 = new THREE.Vector3(other.data.vx, other.data.vy, other.data.vz);
          
          b.data.vx = v2.x * 0.8;
          b.data.vy = v2.y * 0.8;
          b.data.vz = v2.z * 0.8;
          other.data.vx = v1.x * 0.8;
          other.data.vy = v1.y * 0.8;
          other.data.vz = v1.z * 0.8;

          audio.playBeadTap(b.data.pos.clone().add(this.group.position));
        }
      }

      b.mesh.position.copy(b.data.pos);
    }

    const intersects = raycaster.intersectObject(this.balloonMesh);

    if (pointer.active && intersects.length > 0) {
      const hitPt = intersects[0].point;
      this.deformX = hitPt.x * 0.13;
      this.deformY = hitPt.y * 0.13;
      this.group.position.set(this.deformX, this.deformY, 0);

      const dragSpeed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
      this.pressure += (0.0016 + dragSpeed * 0.0003) * (isFrozen ? 1.5 : 1.0);

      // 압력에 따른 Y축 짓눌림 및 X/Z축 팽창 스케일링
      const squash = 1.0 - (this.pressure * 0.15);
      const stretch = 1.0 + (this.pressure * 0.06);
      this.group.scale.set(stretch, squash, stretch);

      this.beads.forEach(b => {
        if (b.data.stage !== 2) {
          b.data.vx += (Math.random() - 0.5) * (2 + dragSpeed * 0.4);
          b.data.vy += (Math.random() - 0.5) * (2 + dragSpeed * 0.4);
          b.data.vz += (Math.random() - 0.5) * (2 + dragSpeed * 0.4);
        }
      });

      // 즉각적인 소리 피드백: 첫 터치 시 100% 재생, 압력 증가에 따라 주기적 재생, 그리고 무작위 드래그 재생
      let shouldPlayCrunch = pointer.justPressed;
      if (this.pressure - this.lastPlayedPressure > 0.08) {
        shouldPlayCrunch = true;
        this.lastPlayedPressure = this.pressure;
      }
      if (Math.random() < 0.12) {
        shouldPlayCrunch = true;
      }

      if (shouldPlayCrunch) {
        const pitch = isFrozen ? 1.6 : 1.35;
        audio.playCrunch('balloon', pitch, hitPt);
        if (navigator.vibrate) navigator.vibrate(isFrozen ? 8 : 5);
      }

      // 비드들의 순차 파열
      const beadPartCount = isFrozen ? 22 : 12;
      const speedMult = isFrozen ? 1.55 : 1.0;
      const sizeMult = isFrozen ? 0.65 : 1.0;

      if (this.pressure > 0.05 && this.pressure < 0.25 && this.beads[0].data.stage !== 2) {
        this.beads[0].data.stage = 1;
      }
      if (this.pressure >= 0.25 && this.beads[0].data.stage !== 2) {
        this.beads[0].data.stage = 2;
        this.group.remove(this.beads[0].mesh);
        audio.playMiniPop(this.beads[0].data.pos.clone().add(this.group.position));
        if (navigator.vibrate) navigator.vibrate(isFrozen ? [15, 50] : [10, 35]);
        
        for (let k = 0; k < beadPartCount; k++) {
          const offset = new THREE.Vector3((Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3);
          const launchVel = offset.clone().normalize().multiplyScalar((3.0 + Math.random()*4.0)*speedMult);
          particles.push(new Particle3D(this.scene, this.beads[0].data.pos.clone().add(this.group.position).add(offset), this.beads[0].data.color, (0.04 + Math.random()*0.04)*sizeMult, 'normal', launchVel));
        }
      }

      if (this.pressure > 0.35 && this.pressure < 0.55 && this.beads[1].data.stage !== 2) {
        this.beads[1].data.stage = 1;
      }
      if (this.pressure >= 0.55 && this.beads[1].data.stage !== 2) {
        this.beads[1].data.stage = 2;
        this.group.remove(this.beads[1].mesh);
        audio.playMiniPop(this.beads[1].data.pos.clone().add(this.group.position));
        if (navigator.vibrate) navigator.vibrate(isFrozen ? [15, 50] : [10, 35]);
        
        for (let k = 0; k < beadPartCount; k++) {
          const offset = new THREE.Vector3((Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3);
          const launchVel = offset.clone().normalize().multiplyScalar((3.0 + Math.random()*4.0)*speedMult);
          particles.push(new Particle3D(this.scene, this.beads[1].data.pos.clone().add(this.group.position).add(offset), this.beads[1].data.color, (0.04 + Math.random()*0.04)*sizeMult, 'normal', launchVel));
        }
      }

      if (this.pressure > 0.65 && this.pressure < 0.85 && this.beads[2].data.stage !== 2) {
        this.beads[2].data.stage = 1;
      }
      if (this.pressure >= 0.85 && this.beads[2].data.stage !== 2) {
        this.beads[2].data.stage = 2;
        this.group.remove(this.beads[2].mesh);
        audio.playMiniPop(this.beads[2].data.pos.clone().add(this.group.position));
        if (navigator.vibrate) navigator.vibrate(isFrozen ? [15, 50] : [10, 35]);
        
        for (let k = 0; k < beadPartCount; k++) {
          const offset = new THREE.Vector3((Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3);
          const launchVel = offset.clone().normalize().multiplyScalar((3.0 + Math.random()*4.0)*speedMult);
          particles.push(new Particle3D(this.scene, this.beads[2].data.pos.clone().add(this.group.position).add(offset), this.beads[2].data.color, (0.04 + Math.random()*0.04)*sizeMult, 'normal', launchVel));
        }
      }

      const allBursted = this.beads.every(b => b.data.stage === 2);
      if (this.pressure >= 1.0 || allBursted) {
        this.explode(particles, isFrozen);
      }
    } else {
      this.deformX *= 0.82;
      this.deformY *= 0.82;
      this.group.position.set(this.deformX, this.deformY, 0);
      this.lastPlayedPressure = this.pressure; // 릴리즈 시 다음 터치 즉시 소리 유도

      // 탄성 복원 스케일
      this.group.scale.x += (1.0 - this.group.scale.x) * 0.18;
      this.group.scale.y += (1.0 - this.group.scale.y) * 0.18;
      this.group.scale.z += (1.0 - this.group.scale.z) * 0.18;
    }
  }

  explode(particles, isFrozen = false) {
    this.stage = 2;
    const pos = this.group.position.clone();
    audio.playPop(isFrozen ? 220 : 190, pos);
    if (navigator.vibrate) navigator.vibrate(isFrozen ? [40, 50, 120] : [30, 40, 90]);

    const speedMult = isFrozen ? 1.5 : 1.0;
    const sizeMult = isFrozen ? 0.65 : 1.0;

    this.beads.forEach(b => {
      if (b.data.stage !== 2) {
        this.group.remove(b.mesh);
        
        const bPos = b.data.pos.clone();
        const radialDir = bPos.clone().normalize();
        const speed = (2.5 + Math.random() * 4.5) * speedMult;
        const launchVel = radialDir.multiplyScalar(speed);
        launchVel.y += 2.0;

        particles.push(new Particle3D(this.scene, bPos.add(pos), b.data.color, (0.05 + Math.random()*0.05)*sizeMult, 'normal', launchVel));
      }
    });

    this.scene.remove(this.group);

    this.softBody = new SoftBody3D(
      this.scene, 
      'sphere', 
      this.r * 0.9, 
      '#e0f7fa', 
      ['#ff80ab', '#80deea', '#ffff8d'], 
      18, 
      ['normal']
    );
    this.softBody.material.transparent = true;
    this.softBody.material.opacity = 0.4;
    this.softBody.material.roughness = 0.1;
    this.softBody.material.metalness = 0.1;
  }

  destroy() {
    if (this.softBody) {
      this.softBody.destroy();
    } else {
      this.scene.remove(this.group);
      this.balloonMesh.geometry.dispose();
      this.balloonMat.dispose();
      this.beads.forEach(b => {
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
      });
    }
  }
}

// ----------------------------------------------------------------------------
// 스킨 4. 초코 바나나 왁뿌 (3D Choco Banana Muddy)
// ----------------------------------------------------------------------------
class ChocoBananaBall {
  constructor(scene) {
    this.scene = scene;
    this.name = "초코 바나나 왁뿌";
    this.r = 1.5;
    
    this.stage = 0;
    this.pressure = 0;
    this.deformX = 0;
    this.deformY = 0;
    
    this.hasGeneratedCracks = false;
    this.crackBranches = [];
    this.lastPlayedPressure = 0.0;
    this.softBody = null;
    this.initMeshes();
  }

  initMeshes() {
    this.group = new THREE.Group();

    const chocoGeo = new THREE.SphereGeometry(this.r, 32, 32);
    // 수제 초콜릿 코팅처럼 자연스러운 굴곡 노이즈 가산
    const cPos = chocoGeo.attributes.position;
    const cNormal = chocoGeo.attributes.normal;
    for (let i = 0; i < cPos.count; i++) {
      const x = cPos.getX(i);
      const y = cPos.getY(i);
      const z = cPos.getZ(i);
      const nx = cNormal.getX(i);
      const ny = cNormal.getY(i);
      const nz = cNormal.getZ(i);
      const noise = (Math.sin(x * 2.2) * Math.cos(z * 2.2)) * 0.028;
      cPos.setXYZ(i, x + nx * noise, y + ny * noise, z + nz * noise);
    }
    chocoGeo.computeVertexNormals();

    const chocoMat = new THREE.MeshPhysicalMaterial({
      color: 0x3e2723,
      roughness: 0.45,
      metalness: 0.0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.3
    });
    this.chocoMesh = new THREE.Mesh(chocoGeo, chocoMat);
    this.chocoMesh.castShadow = true;
    this.group.add(this.chocoMesh);

    this.crackGroup = new THREE.Group();
    this.crackGroup.visible = false;
    this.group.add(this.crackGroup);

    this.scene.add(this.group);
  }

  generateCracks(localHitPoint) {
    this.crackGroup.clear();
    this.crackBranches = [];

    const crackMat = new THREE.LineBasicMaterial({
      color: 0xffd54f,
      linewidth: 2.5,
      transparent: true,
      opacity: 0.95
    });

    const numBranches = 8;
    const normal = localHitPoint.clone().normalize();
    let tangent = new THREE.Vector3(0, 1, 0).cross(normal);
    if (tangent.lengthSq() < 0.01) {
      tangent = new THREE.Vector3(1, 0, 0).cross(normal);
    }
    tangent.normalize();
    const binormal = normal.clone().cross(tangent).normalize();

    for (let i = 0; i < numBranches; i++) {
      const angle = (i / numBranches) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const dir = tangent.clone().multiplyScalar(Math.cos(angle)).add(binormal.clone().multiplyScalar(Math.sin(angle))).normalize();
      
      const points = [];
      let currentPt = localHitPoint.clone().normalize().multiplyScalar(this.r + 0.015);
      points.push(currentPt.clone());

      const numSteps = 15;
      const stepSize = (this.r * Math.PI * 0.75) / numSteps;

      for (let step = 1; step <= numSteps; step++) {
        const nextPt = currentPt.clone().addScaledVector(dir, stepSize);
        const jitterDir = normal.clone().cross(dir).normalize();
        nextPt.addScaledVector(jitterDir, (Math.random() - 0.5) * stepSize * 0.4);
        nextPt.normalize().multiplyScalar(this.r + 0.015);
        
        points.push(nextPt.clone());
        currentPt = nextPt;
        dir.copy(nextPt).sub(points[points.length - 2]).normalize();
      }

      const crackGeo = new THREE.BufferGeometry().setFromPoints(points);
      const crackLine = new THREE.Line(crackGeo, crackMat);
      this.crackGroup.add(crackLine);
      this.crackBranches.push({
        line: crackLine,
        points: points
      });
    }
  }

  update(pointer, raycaster, targetPos, particles, isFrozen = false) {
    if (this.stage === 2) {
      if (this.softBody) this.softBody.update(pointer, raycaster, targetPos);
      return;
    }

    const intersects = raycaster.intersectObject(this.chocoMesh);

    if (pointer.active && intersects.length > 0) {
      const hitPt = intersects[0].point;
      this.deformX = hitPt.x * 0.11;
      this.deformY = hitPt.y * 0.11;
      this.group.position.set(this.deformX, this.deformY, 0);

      const speed = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
      this.pressure += (0.0015 + speed * 0.0002) * (isFrozen ? 1.5 : 1.0);

      // 즉각적인 방사형 크랙 생성
      if (!this.hasGeneratedCracks) {
        const localHit = this.chocoMesh.worldToLocal(hitPt.clone());
        this.generateCracks(localHit);
        this.hasGeneratedCracks = true;
      }

      if (this.pressure > 0.05) {
        this.stage = 1;
        this.crackGroup.visible = true;
        this.crackGroup.scale.setScalar(1.0 + this.pressure * 0.012);
        
        // 크랙 방사형 번짐 애니메이션
        const propFactor = Math.max(0, Math.min(1.0, (this.pressure - 0.05) / 0.85));
        this.crackBranches.forEach(branch => {
          const totalPoints = branch.points.length;
          const drawCount = Math.floor(propFactor * totalPoints);
          branch.line.geometry.setDrawRange(0, drawCount);
        });
      }

      // 압력에 따른 Y축 짓눌림 및 X/Z축 팽창 스케일링
      const squash = 1.0 - (this.pressure * 0.16);
      const stretch = 1.0 + (this.pressure * 0.06);
      this.group.scale.set(stretch, squash, stretch);

      // 즉각적인 소리 피드백: 첫 터치 시 100% 재생, 압력 증가에 따라 주기적 재생, 그리고 무작위 드래그 재생
      let shouldPlayCrunch = pointer.justPressed;
      if (this.pressure - this.lastPlayedPressure > 0.08) {
        shouldPlayCrunch = true;
        this.lastPlayedPressure = this.pressure;
      }
      if (Math.random() < 0.12) {
        shouldPlayCrunch = true;
      }

      if (shouldPlayCrunch) {
        const pitch = isFrozen ? 0.75 : 0.62;
        audio.playCrunch('choco', pitch, hitPt); 
        if (navigator.vibrate) navigator.vibrate(isFrozen ? 9 : 6);
        particles.push(new Particle3D(this.scene, hitPt, '#4e342e', (0.04 + Math.random()*0.05)*(isFrozen ? 0.65 : 1.0)));
      }

      if (this.pressure >= 1.0) {
        this.explode(particles, isFrozen);
      }
    } else {
      this.deformX *= 0.82;
      this.deformY *= 0.82;
      this.group.position.set(this.deformX, this.deformY, 0);
      this.lastPlayedPressure = this.pressure; // 릴리즈 시 다음 터치 즉시 소리 유도

      // 탄성 복원 스케일
      this.group.scale.x += (1.0 - this.group.scale.x) * 0.18;
      this.group.scale.y += (1.0 - this.group.scale.y) * 0.18;
      this.group.scale.z += (1.0 - this.group.scale.z) * 0.18;
    }
  }

  explode(particles, isFrozen = false) {
    this.stage = 2;
    const pos = this.group.position.clone();
    audio.playPop(isFrozen ? 150 : 125, pos);
    if (navigator.vibrate) navigator.vibrate(isFrozen ? [35, 55, 130] : [25, 35, 100]);

    // 냉동 여부에 따른 파편 물리 파라미터 튜닝
    const count = isFrozen ? 55 : 30;
    const speedMult = isFrozen ? 1.55 : 1.0;
    const sizeMult = isFrozen ? 0.65 : 1.0;

    for (let i = 0; i < count; i++) {
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * this.r,
        (Math.random() - 0.5) * this.r,
        (Math.random() - 0.5) * this.r
      );
      const partPos = pos.clone().add(offset);
      
      // 방사형 발사 물리 연산
      const radialDir = offset.clone().normalize();
      const speed = (2.2 + Math.random() * 4.5) * speedMult;
      const launchVel = radialDir.multiplyScalar(speed);
      launchVel.y += 1.8;

      const shardSize = (0.05 + Math.random() * 0.06) * sizeMult;
      particles.push(new Particle3D(this.scene, partPos, '#4e342e', shardSize, 'normal', launchVel));

      if (Math.random() < 0.4) {
        const bananaVel = launchVel.clone().multiplyScalar(0.85);
        particles.push(new Particle3D(this.scene, partPos, '#ffd54f', (0.05 + Math.random() * 0.05) * sizeMult, 'normal', bananaVel));
      }
    }

    this.scene.remove(this.group);

    this.softBody = new SoftBody3D(this.scene, 'sphere', this.r * 1.05, '#ffd54f', '#4e342e', 18, ['normal']);
    this.softBody.meltShards = true;
    this.softBody.targetColor = '#bcaaa4'; 
  }

  destroy() {
    if (this.softBody) {
      this.softBody.destroy();
    } else {
      this.scene.remove(this.group);
      this.chocoMesh.geometry.dispose();
      this.chocoMesh.material.dispose();
      this.crackGroup.children.forEach(c => {
        c.geometry.dispose();
        c.material.dispose();
      });
    }
  }
}


// ============================================================================
// 5. 3D 시뮬레이션 시스템 총괄 및 루프 제어 (WebGL Orchestrator)
// ============================================================================
class App3D {
  constructor() {
    this.canvas = document.getElementById('physics-canvas');
    
    this.btnAudio = document.getElementById('btn-audio-toggle');
    this.btnHaptic = document.getElementById('btn-haptic-toggle');
    this.btnFreeze = document.getElementById('btn-freeze-toggle');
    this.btnReset = document.getElementById('btn-reset');
    this.hudBallName = document.getElementById('ball-name-display');
    this.hudStatus = document.getElementById('status-title');
    this.guideOverlay = document.getElementById('interaction-guide');
    this.cards = document.querySelectorAll('.skin-card');

    this.pointer = { x: 0, y: 0, px: 0, py: 0, active: false, xNDC: 0, yNDC: 0, justPressed: false };
    this.hapticEnabled = true;
    this.isFrozen = false;

    this.activeSkin = 'green-apple';
    this.ball = null;
    this.particles = [];

    this.firstTouchOccurred = false;

    this.cameraRadius = 6.8;
    this.theta = 0.0; 
    this.phi = Math.PI / 2; 
    this.isOrbiting = false;

    this.initWebGL();
    this.initEvents();
    this.spawnBall();
    this.animate();
  }

  initWebGL() {
    const rect = this.canvas.getBoundingClientRect();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 100);
    this.updateCameraPos();

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.raycaster = new THREE.Raycaster();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight.position.set(4, 7, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.55);
    rimLight.position.set(-6, 4, -6);
    this.scene.add(rimLight);

    this.cyanLight = new THREE.PointLight(0x00f0ff, 1.3, 15);
    this.cyanLight.position.set(-5, 2, 1);
    this.scene.add(this.cyanLight);

    this.pinkLight = new THREE.PointLight(0xff007f, 1.3, 15);
    this.pinkLight.position.set(5, -2, 1);
    this.scene.add(this.pinkLight);

    const floorGeo = new THREE.PlaneGeometry(15, 15);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.18 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.2;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  updateCameraPos() {
    this.camera.position.x = this.cameraRadius * Math.sin(this.phi) * Math.sin(this.theta);
    this.camera.position.z = this.cameraRadius * Math.sin(this.phi) * Math.cos(this.theta);
    this.camera.position.y = this.cameraRadius * Math.cos(this.phi);
    this.camera.lookAt(0, 0, 0);
  }

  spawnBall() {
    audio.stopAllSounds();

    if (this.ball) {
      this.ball.destroy();
    }
    this.particles.forEach(p => p.destroy());
    this.particles = [];

    audio.activeSkin = this.activeSkin;

    switch (this.activeSkin) {
      case 'green-apple':
        this.ball = new GreenAppleBall(this.scene);
        this.hudBallName.textContent = "청사과 아삭 왁뿌";
        break;
      case 'butter-stick':
        this.ball = new ButterStickBall(this.scene);
        this.hudBallName.textContent = "3레이어 버터 왁뿌";
        break;
      case 'mini-balloon':
        this.ball = new MiniBalloonBall(this.scene);
        this.hudBallName.textContent = "크리스피 미니 왁볼";
        break;
      case 'choco-banana':
        this.ball = new ChocoBananaBall(this.scene);
        this.hudBallName.textContent = "초코 바나나 왁뿌";
        break;
    }

    this.hudStatus.textContent = "준비 완료";
    this.hudStatus.className = "status-badge";
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
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

      this.pointer.xNDC = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.yNDC = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleStart = (e) => {
      updatePointer(e, true);
      this.pointer.justPressed = true; // 터치/클릭 시작 플래그 설정
      this.raycaster.setFromCamera(new THREE.Vector2(this.pointer.xNDC, this.pointer.yNDC), this.camera);
      
      let intersects = [];
      if (this.ball) {
        if (this.ball.stage === 2 && this.ball.softBody) {
          intersects = this.raycaster.intersectObject(this.ball.softBody.mesh);
        } else if (this.ball.group) {
          intersects = this.raycaster.intersectObjects(this.ball.group.children, true);
        }
      }

      if (intersects.length > 0) {
        this.isOrbiting = false;
      } else {
        this.isOrbiting = true;
      }
    };

    const handleMove = (e) => {
      if (!this.pointer.active) return;
      
      const prevNDC = new THREE.Vector2(this.pointer.xNDC, this.pointer.yNDC);
      updatePointer(e, true);

      if (this.isOrbiting) {
        const dx = this.pointer.xNDC - prevNDC.x;
        const dy = this.pointer.yNDC - prevNDC.y;
        
        this.theta -= dx * 1.5;
        this.phi -= dy * 1.5;
        this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));
        this.updateCameraPos();
      }
    };

    const handleEnd = () => {
      this.pointer.active = false;
      this.isOrbiting = false;
    };

    this.canvas.addEventListener('mousedown', handleStart, { passive: false });
    this.canvas.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);

    this.canvas.addEventListener('touchstart', handleStart, { passive: false });
    this.canvas.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

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

    if (this.btnFreeze) {
      this.btnFreeze.addEventListener('click', () => {
        this.isFrozen = !this.isFrozen;
        if (this.isFrozen) {
          this.btnFreeze.classList.add('active');
        } else {
          this.btnFreeze.classList.remove('active');
        }
      });
    }

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
    this.raycaster.setFromCamera(new THREE.Vector2(this.pointer.xNDC, this.pointer.yNDC), this.camera);

    const target3D = new THREE.Vector3(
      this.pointer.xNDC * 3.3,
      this.pointer.yNDC * 2.5,
      0
    );

    if (this.ball) {
      this.ball.update(this.pointer, this.raycaster, target3D, this.particles, this.isFrozen);
      
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
      p.update();
      if (p.life <= 0) {
        p.destroy();
        this.particles.splice(i, 1);
      }
    }

    this.pointer.px = this.pointer.x;
    this.pointer.py = this.pointer.y;
    this.pointer.justPressed = false; // 매 프레임 끝에서 justPressed 플래그 클리어

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }
}

function interpolateColor(color1, color2, factor) {
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

window.addEventListener('DOMContentLoaded', () => {
  audio.init(); // 오디오 리소스 즉시 프리로드 시작
  new App3D();
});
