(() => {
  const width = 764;
  const height = 508;
  const warpCache = new WeakMap();
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };

  // Coordinates are measured on the original illustration. The feathered
  // displacement moves the painted subject while leaving its surroundings intact.
  function warp(ctx, pixels, [cx, cy, rx, ry], displacement) {
    if (!warpCache.has(ctx)) warpCache.set(ctx, new Map());
    const regions = warpCache.get(ctx);
    if (!regions.has(cx)) {
      const left = Math.max(0, Math.floor(cx - rx));
      const top = Math.max(0, Math.floor(cy - ry));
      const right = Math.min(width, Math.ceil(cx + rx));
      const bottom = Math.min(height, Math.ceil(cy + ry));
      const patch = ctx.createImageData(right - left, bottom - top);
      const weights = new Float32Array(patch.width * patch.height);
      let index = 0;
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const distance = Math.hypot((x - cx) / rx, (y - cy) / ry);
          weights[index++] = smooth((1 - distance) * 2.2);
        }
      }
      regions.set(cx, {left, top, right, bottom, patch, weights});
    }
    const {left, top, right, bottom, patch, weights} = regions.get(cx);
    let index = 0;
    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const weight = weights[index];
        const [dx, dy] = weight ? displacement(x, y) : [0, 0];
        const sx = Math.round(Math.min(width - 1, Math.max(0, x - dx * weight)));
        const sy = Math.round(Math.min(height - 1, Math.max(0, y - dy * weight)));
        const from = (sy * width + sx) * 4;
        const to = index++ * 4;
        patch.data[to] = pixels[from];
        patch.data[to + 1] = pixels[from + 1];
        patch.data[to + 2] = pixels[from + 2];
        patch.data[to + 3] = 255;
      }
    }
    ctx.putImageData(patch, left, top);
  }

  function echo(ctx, x, y, age, radiusX, radiusY, color = '255,235,165') {
    if (age < 0 || age >= 1) return;
    const spread = .28 + smooth(age) * .72;
    ctx.strokeStyle = 'rgba(' + color + ',' + ((1 - age) * .82) + ')';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX * spread, radiusY * spread, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const drumMasks = [
    // Torso, hair and sleeves behind the moving forearms.
    'M 227 508 Q 245 475 256 450 L 206 508 L 206 502 Q 244 457 272 446 L 240 452 Q 251 440 273 439 L 307 425 L 326 402 L 329 376 L 339 357 L 311 343 Q 272 358 232 348 Q 211 350 205 325 Q 193 289 219 252 Q 235 231 267 231 L 343 225 Q 361 206 381 196 L 398 188 Q 395 161 407 142 L 378 177 L 375 172 Q 382 145 405 122 Q 396 110 409 93 Q 423 72 452 80 Q 477 70 510 80 Q 538 87 549 112 Q 561 149 550 177 Q 559 196 539 208 Q 519 244 497 248 L 524 249 L 552 263 L 581 271 Q 596 274 608 283 L 623 290 L 642 287 Q 662 290 657 329 Q 656 365 632 383 Q 605 393 582 379 Q 534 372 501 385 Q 476 405 418 414 Q 369 418 348 430 Q 336 444 344 508 Z',
    // Right forearm, wrist and mallet.
    'M 251 293 Q 262 279 279 282 Q 301 288 323 302 L 346 318 Q 362 320 375 329 Q 383 336 381 350 L 456 389 Q 467 384 478 394 Q 487 401 486 410 Q 484 426 466 427 Q 446 426 447 402 L 382 367 Q 377 375 367 374 Q 348 373 337 365 Q 325 356 322 340 Q 287 326 253 309 Z',
    // Left forearm and the inner clapper.
    'M 611 321 Q 614 297 622 273 L 623 253 Q 616 240 622 229 L 643 174 Q 653 172 665 180 L 647 227 Q 655 229 662 237 Q 666 246 660 257 L 650 275 Q 647 309 626 337 Q 617 340 611 321 Z',
    // Outer clapper, hinged at the grip.
    'M 651 229 L 688 191 Q 696 191 705 203 L 658 249 Z'
  ];

  function swingLayer(ctx, image, x, y, angle) {
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);
    ctx.drawImage(image,-x,-y);
    ctx.restore();
  }

  function drum(ctx, pixels, time, [torso, strikeArm, clapperArm, outerClapper]) {
    const beat = (time / 1.24 + .16) % 1;
    const lift = beat < .66 ? smooth(beat/.66) : 1-smooth((beat-.66)/.18);
    const click = (time / .62 + .12) % 1;
    const clapperTilt = .075*Math.sin(click*Math.PI*2);
    ctx.drawImage(torso,0,0);
    swingLayer(ctx,strikeArm,261,300,-.24*lift);
    ctx.save();
    ctx.translate(622,321);
    ctx.rotate(clapperTilt);
    ctx.translate(-622,-321);
    swingLayer(ctx,outerClapper,654,247,-.19*Math.sin(Math.PI*click));
    ctx.drawImage(clapperArm,0,0);
    ctx.restore();
    echo(ctx,467,423,(beat-.84)*5.4,85,15);
    echo(ctx,661,201,(click-.64)*3.3,27,13);
  }

  const braid = 'C 333 258 402 290 371 319 C 345 347 395 359 376 384';
  const ribbons = [
    ['#ff7760', 'M 48 36 C 10 128 73 187 157 149 C 246 119 265 161 285 199 C 310 222 322 211 357 242 '+braid],
    ['#ffcf67', 'M 258 8 C 201 44 195 87 260 112 C 318 137 351 141 329 184 C 314 218 352 225 357 242 '+braid],
    ['#a9e3a2', 'M 510 7 C 549 64 497 98 442 112 C 398 124 373 157 390 181 C 413 213 389 229 357 242 '+braid],
    ['#91daff', 'M 691 9 C 784 65 673 129 638 140 C 581 169 507 145 472 186 C 448 221 389 222 357 242 '+braid]
  ].map(([color, path]) => [color, new Path2D(path)]);

  function blend(ctx, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ribbons.forEach(([color, path], index) => {
      const flow = clamp((time - index * .14) / 3.45);
      ctx.globalAlpha = Math.min(smooth(flow * 8), smooth((1 - flow) * 4)) * .74;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 6;
      ctx.setLineDash([112, 710]);
      ctx.lineDashOffset = 112 - [585, 520, 513, 588][index] * smooth(flow);
      ctx.stroke(path);
    });
    ctx.restore();
    echo(ctx, 375, 386, (time - 2.55) / 1.6, 144, 33);
    echo(ctx, 375, 386, (time - 2.85) / 1.6, 161, 38);
  }

  const fingertips = [[220,275], [305,235], [387,196], [474,161], [540,141], [604,77]];
  function strings(ctx, pixels, time) {
    warp(ctx, pixels, [365, 127, 334, 156], (x, y) => [
      0, 7 * Math.sin(time * 24 - x / 24) * smooth((y - 28) / 110)
    ]);
    const step = Math.floor(time * 13);
    for (let trail = 0; trail < 3; trail++) {
      const [x, y] = fingertips[(step + fingertips.length - trail) % fingertips.length];
      const age = ((time * 13) % 1 + trail) / 3;
      ctx.beginPath();
      ctx.moveTo(x - 140, y + 57);
      ctx.quadraticCurveTo(x, y + Math.sin(age * 24) * 7, x + 145, y - 56);
      ctx.strokeStyle = 'rgba(255,223,148,' + ((1 - age) * .8) + ')';
      ctx.lineWidth = 2.1 - age;
      ctx.stroke();
    }
  }

  const birdMasks = {
    oriole: [
      'M 396 183 Q 373 166 363 140 Q 336 70 305 18 Q 289 11 305 58 L 277 25 Q 261 7 274 39 L 291 76 L 247 46 Q 229 37 248 66 L 276 98 L 239 79 Q 220 63 226 90 L 265 121 L 235 114 Q 207 104 235 127 L 269 146 Q 211 134 232 155 L 266 174 Q 232 164 238 184 Q 254 214 294 236 Q 323 244 359 218 Z',
      'M 201 280 Q 287 261 325 236 Q 349 209 366 199 Q 383 173 399 173 Q 427 139 452 146 L 470 153 L 507 142 L 502 148 L 509 149 L 477 165 Q 470 203 444 229 Q 421 255 382 266 L 383 277 L 368 284 L 366 274 L 334 288 Q 304 330 265 350 Q 253 355 251 344 Q 223 355 227 341 Q 201 344 208 328 Q 188 328 205 310 Q 191 309 204 296 Q 197 295 201 280 Z'
    ],
    swallow: [
      'M 389 249 Q 367 221 348 195 Q 311 157 260 119 Q 244 107 252 126 L 226 106 Q 214 98 223 123 L 248 151 L 229 139 Q 213 133 223 151 L 260 179 L 227 165 Q 211 162 229 185 L 273 210 Q 234 196 240 212 L 280 235 Q 248 220 259 241 L 293 263 Q 271 255 282 271 Q 308 298 335 294 Q 360 284 389 249 Z',
      'M 188 354 Q 233 330 280 319 Q 319 307 338 296 Q 353 279 368 260 Q 385 241 395 237 Q 407 217 428 218 Q 440 218 445 224 L 455 218 L 453 225 L 446 228 Q 435 239 428 259 Q 423 279 410 289 L 429 285 L 436 294 L 425 294 L 410 307 L 410 319 L 400 322 L 403 309 L 389 324 Q 377 329 365 329 L 341 345 L 234 409 Q 230 409 235 403 L 302 348 L 283 347 L 319 326 Q 246 337 188 356 Z'
    ]
  };
  function cutoutLayers(image,masks) {
    return masks.map(shape=>{
      const layer = document.createElement('canvas');
      layer.width = width;
      layer.height = height;
      const ctx = layer.getContext('2d');
      ctx.clip(new Path2D(shape));
      ctx.drawImage(image,0,0,width,height);
      return layer;
    });
  }
  function repairDrummerTorso(image,torso) {
    const ctx = torso.getContext('2d');
    // Fill the robe where the painted hand and mallet used to cover it.
    const patch = document.createElement('canvas');
    const mask = document.createElement('canvas');
    patch.width = mask.width = width;
    patch.height = mask.height = height;
    const repair = patch.getContext('2d');
    const edge = mask.getContext('2d');
    edge.filter='blur(3px)';
    edge.fill(new Path2D('M 321 326 Q 347 316 378 326 Q 387 331 387 349 L 459 386 Q 475 381 487 393 Q 490 406 483 419 L 447 421 L 442 403 L 382 370 Q 377 381 362 379 Q 336 377 326 363 Z'));
    const sx = image.naturalWidth/width;
    const sy = image.naturalHeight/height;
    repair.drawImage(image,362*sx,374*sy,75*sx,34*sy,304,305,196,127);
    repair.globalCompositeOperation='destination-in';
    repair.drawImage(mask,0,0);
    ctx.save();
    ctx.globalCompositeOperation='source-atop';
    ctx.drawImage(patch,0,0);
    ctx.restore();
  }
  function bird(ctx, time, [wing,body], returning) {
    const travel = smooth(time / 4.0);
    const flap = Math.sin(time * (returning?16:13));
    const [hingeX,hingeY] = returning?[360,255]:[361,194];
    const x = returning ? -160+274*travel : -135+338*travel;
    const y = returning ? 115-165*travel : 160-277*travel;
    const scale = returning ? 1-.55*smooth((travel-.44)/.56) : .67+.37*smooth(travel*2);
    const opacity = returning ? 1-smooth((travel-.87)/.13) : 1-smooth((travel-.86)/.14);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(hingeX+x,hingeY+y+flap*4);
    ctx.rotate(returning?.08-.2*travel:-.13);
    ctx.scale(scale,scale);
    ctx.save();
    ctx.rotate(flap*.16);
    ctx.scale(1,.68+flap*.29);
    ctx.drawImage(wing,-hingeX,-hingeY);
    ctx.restore();
    ctx.drawImage(body,-hingeX,-hingeY);
    ctx.restore();
  }

  function lightning(ctx, pixels, time) {
    const glow = .14 * Math.exp(-Math.pow((time-.62)/.21, 2));
    const light = ctx.createRadialGradient(500, 88, 12, 500, 88, 285);
    light.addColorStop(0, 'rgba(255,241,207,' + glow + ')');
    light.addColorStop(1, 'rgba(255,241,207,0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);
  }

  let audioContext;
  function armAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ??= new Audio();
    return audioContext;
  }

  function playThunder(audio,recording) {
    if (recording) return [playBuffer(audio,recording,.82,.68)];
    const duration = 3.4;
    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * duration), audio.sampleRate);
    const samples = buffer.getChannelData(0);
    let bass = 0;
    let body = 0;
    for (let i = 0; i < samples.length; i++) {
      const t = i / audio.sampleRate;
      const noise = Math.random()*2 - 1;
      bass += (noise - bass) * .017;
      body += (noise - body) * .075;
      const swell = (1 - Math.exp(-t * 28)) * Math.exp(-t * 1.24);
      const roll = .78 + .16 * Math.sin(t * 22) + .06 * Math.sin(t * 33);
      samples[i] = (bass * 1.8 + body * .55 + noise * .08 * Math.exp(-t * 14)) * swell * roll;
    }
    const sound = audio.createBufferSource();
    const volume = audio.createGain();
    volume.gain.value = .64;
    sound.buffer = buffer;
    sound.connect(volume).connect(audio.destination);
    sound.start(audio.currentTime + .88);
    return [sound];
  }

  // The large pearls fall toward the front of the plate and ring lower.
  const drops = [
    [.71,318,329,8],[1.02,459,335,18],[1.28,384,363,11],
    [1.58,513,365,16],[1.76,276,320,7],[2.03,341,382,12],
    [2.21,459,302,7],[2.43,420,386,10],[2.73,552,330,9],[2.99,484,355,14]
  ];
  function pearls(ctx, pixels, time) {
    for (const [impact, x, base, radius] of drops) {
      const age = time - impact;
      if (age < -.65 || age >= .75) continue;
      const fall = clamp(1 + age / .65);
      const bounce = age > 0 ? Math.max(0,1-age/.34)*Math.abs(Math.sin(age*12))*radius : 0;
      const y = base - radius - (1 - fall*fall)*220 - bounce;
      const centerX = x + (1 - fall)*22 + Math.max(0, age)*radius*.9;
      const finish = 1 - smooth((age-.42)/.33);
      ctx.save();
      ctx.globalAlpha = smooth((age+.65)/.16) * finish;
      const sheen = ctx.createRadialGradient(centerX-radius*.32,y-radius*.38,.4,centerX,y,radius);
      sheen.addColorStop(0,'#fffdf2');
      sheen.addColorStop(.28,'#ffecc8');
      sheen.addColorStop(.62,'#d9bca6');
      sheen.addColorStop(.82,'#a4bfb3');
      sheen.addColorStop(1,'#f9dab1');
      ctx.fillStyle=sheen;
      ctx.beginPath();
      ctx.arc(centerX,y,radius,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
      echo(ctx,x,base,age*2.9,radius*2.1,radius*.55);
    }
  }

  function playPearls(audio) {
    const start = audio.currentTime;
    return drops.flatMap(([impact,,,radius]) => [1,2.17].map((ratio, index) => {
      const source = audio.createOscillator();
      const gain = audio.createGain();
      const time = start + impact;
      const length = index ? .085 : .22;
      source.frequency.value = (2080 - radius * 49) * ratio;
      gain.gain.setValueAtTime(.0001,time);
      gain.gain.exponentialRampToValueAtTime(index ? .029 : .105,time + .003);
      gain.gain.exponentialRampToValueAtTime(.0001,time + length);
      source.connect(gain).connect(audio.destination);
      source.start(time);
      source.stop(time + length);
      return source;
    }));
  }

  function serpent(ctx, pixels, time) {
    const lead = -.07 + 1.32 * smooth(time / 4.9);
    let head;
    let previous;
    for (let index = 0; index <= 65; index++) {
      const along = lead - .32 * (1 - index / 65);
      const x = along * width;
      const y = 259 - 126 * along + Math.sin(along * 16) * 32
        + Math.sin(along * 46 - time * 6) * 6;
      const depth = .32 + .68 * smooth((Math.cos(along * 23) + .45) * 2);
      const point = [x,y,depth];
      if (previous) {
        ctx.beginPath();
        ctx.moveTo(previous[0],previous[1]);
        ctx.lineTo(x,y);
        ctx.lineCap = 'round';
        ctx.lineWidth = 1 + 5 * Math.pow(index/65,.7);
        ctx.strokeStyle = 'rgba(195,129,37,'+depth+')';
        ctx.stroke();
        ctx.lineWidth *= .47;
        ctx.strokeStyle = 'rgba(255,226,143,'+depth+')';
        ctx.stroke();
      }
      head = previous;
      previous = point;
    }
    const [x,y,depth] = previous;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(Math.atan2(y-head[1],x-head[0]));
    ctx.globalAlpha = depth;
    ctx.fillStyle = '#e9b85c';
    ctx.beginPath();
    ctx.ellipse(1,0,7,3.8,0,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#2f2518';
    ctx.fillRect(3,-2,1.5,1.5);
    ctx.restore();
  }

  function underground(ctx, pixels, time) {
    const rise = smooth(time / 2.8);
    for (let wave = 0; wave < 5; wave++) {
      const age = (time - wave*.48) / 1.25;
      if (age < 0 || age >= 1) continue;
      echo(ctx,392,303,age,45+rise*132,14+rise*37,'255,198,90');
    }
    const light = ctx.createRadialGradient(392,303,3,392,303,18+rise*86);
    light.addColorStop(0,'rgba(255,186,79,' + rise*.45 + ')');
    light.addColorStop(1,'rgba(255,186,79,0)');
    ctx.fillStyle = light;
    ctx.fillRect(0,0,width,height);
  }

  function playRise(audio) {
    const start = audio.currentTime;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(.001,start);
    gain.gain.exponentialRampToValueAtTime(.012,start+.9);
    gain.gain.exponentialRampToValueAtTime(.13,start+2.52);
    gain.gain.exponentialRampToValueAtTime(.001,start+3.27);
    gain.connect(audio.destination);
    return [1,1.502].map(ratio => {
      const osc = audio.createOscillator();
      osc.frequency.setValueAtTime(71*ratio,start);
      osc.frequency.exponentialRampToValueAtTime(221*ratio,start+2.95);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start+3.3);
      return osc;
    });
  }

  const bursts = [[1.1,383,210,'#ffe58a'],[1.43,203,99,'#ff7959'],[1.59,565,112,'#8ec7ff'],[2,447,104,'#ffbc65']];
  function fireworks(ctx, pixels, time) {
    if (time < 1.1) {
      const y = 389 - 179 * smooth(time / 1.1);
      ctx.beginPath();
      ctx.moveTo(383,y+40);
      ctx.lineTo(383,y);
      ctx.strokeStyle='#ffe3a0';
      ctx.lineWidth=2;
      ctx.stroke();
    }
    for (const [at,x,y,color] of bursts) {
      const age = (time-at) / 1.62;
      if (age<0 || age>=1) continue;
      ctx.save();
      ctx.globalAlpha = Math.pow(1-age,1.7) * .84;
      ctx.strokeStyle=color;
      ctx.lineWidth=1.6;
      ctx.beginPath();
      for(let i=0;i<45;i++){
        const angle = i * 2.39996;
        const radius = (60+(i*41)%95) * smooth(age*1.4);
        const dx = Math.cos(angle)*radius;
        const dy = Math.sin(angle)*radius;
        ctx.moveTo(x+dx*.8,y+dy*.8+age*age*24);
        ctx.lineTo(x+dx,y+dy+age*age*40);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function playFireworks(audio) {
    const buffer = audio.createBuffer(1, audio.sampleRate * 4, audio.sampleRate);
    const samples = buffer.getChannelData(0);
    let low = 0;
    for (let i=0;i<samples.length;i++) {
      const t = i/audio.sampleRate;
      const noise = Math.random()*2-1;
      low += (noise-low)*.06;
      for (const [at] of bursts) {
        const delta=t-at;
        if(delta>=0&&delta<1.17){
          const crack = Math.pow(.5+.5*Math.sin(delta*157+Math.sin(delta*37)),7);
          samples[i] += (low*.57 + noise*(.27*Math.exp(-delta*38)+crack*.07))
            * (1-Math.exp(-delta*248)) * Math.exp(-delta*5.8);
        }
      }
    }
    return [playBuffer(audio,buffer,.56)];
  }

  function clapping(ctx,pixels,time) {
    const hands = [
      [435,250,29,36,0],[584,232,28,30,.2],[259,286,32,33,.7],
      [88,219,24,27,.28],[287,227,19,32,.64],[444,183,20,25,.41],
      [577,169,16,22,.15],[615,340,26,38,.52],[724,266,24,30,.31],[130,166,18,21,.77],
      [164,321,20,34,.27],[563,351,21,33,.65],[187,182,14,17,.19],
      [233,151,13,15,.86],[371,151,14,16,.44],[328,147,13,15,.71],
      [622,165,13,18,.95],[682,194,14,17,.33],[750,208,13,18,.63]
    ];
    for(const [x,y,rx,ry,phase] of hands) {
      const beat = (time/(.32+.13*phase)+phase)%1;
      warp(ctx,pixels,[x,y,rx,ry],(column) => [
        (column-x)*.58*Math.sin(beat*Math.PI),-4.4*Math.sin(beat*Math.PI*2)
      ]);
    }
  }

  function playBuffer(audio,buffer,level,delay=0,rate=1,destination=audio.destination) {
    const source = audio.createBufferSource();
    const gain = audio.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gain.gain.value = level;
    source.connect(gain).connect(destination);
    source.start(audio.currentTime+delay);
    return source;
  }
  let cheeringBus;
  function playCheering(audio,buffer) {
    if (!buffer) return [];
    if (!cheeringBus) {
      cheeringBus = audio.createDynamicsCompressor();
      cheeringBus.threshold.value = -13;
      cheeringBus.ratio.value = 4;
      cheeringBus.connect(audio.destination);
    }
    const claps = audio.createBuffer(1,Math.floor(audio.sampleRate*4.4),audio.sampleRate);
    const samples = claps.getChannelData(0);
    for (let i=0;i<124;i++) {
      const at = Math.floor((.04+i*.032+Math.random()*.09)*audio.sampleRate);
      const level = .065+Math.random()*.11;
      for (let j=0;j<audio.sampleRate*.046&&at+j<samples.length;j++) {
        const seconds = j/audio.sampleRate;
        samples[at+j] += (Math.random()*2-1)*level*Math.exp(-seconds*(95+i%53))*Math.min(1,seconds*550);
      }
    }
    return [
      playBuffer(audio,buffer,.79,0,1,cheeringBus),
      playBuffer(audio,buffer,.52,.12,.97,cheeringBus),
      playBuffer(audio,buffer,.33,.27,1.09,cheeringBus),
      playBuffer(audio,buffer,.20,.44,.93,cheeringBus),
      playBuffer(audio,claps,.69,.13,1,cheeringBus)
    ];
  }

  const recordings = new Map();
  function prepareRecording(audio,file) {
    if (!recordings.has(file)) {
      recordings.set(file,fetch('audio/'+file).then(response=>{
        if (!response.ok) throw new Error('Audio unavailable');
        return response.arrayBuffer();
      }).then(bytes=>audio.decodeAudioData(bytes)).catch(()=>{
        recordings.delete(file);
        return null;
      }));
    }
    return recordings.get(file);
  }

  function steelWire(ctx, pixels, time) {
    const travel = smooth(time / 1.25);
    const headX = 12+630*travel;
    const headY = 462-414*travel;
    const hold = 1-smooth((time-2.0)/1.2);
    if (!hold) return;
    const trail = ctx.createLinearGradient(12,462,headX,headY);
    trail.addColorStop(0,'rgba(252,231,190,0)');
    trail.addColorStop(.72,'rgba(255,231,189,'+hold*.44+')');
    trail.addColorStop(1,'rgba(255,248,224,'+hold+')');
    ctx.strokeStyle=trail;
    ctx.lineWidth=2.2;
    ctx.beginPath();
    ctx.moveTo(12,462);
    ctx.lineTo(headX,headY);
    ctx.stroke();
    const halo=ctx.createRadialGradient(headX,headY,0,headX,headY,16);
    halo.addColorStop(0,'rgba(255,254,233,'+hold+')');
    halo.addColorStop(.29,'rgba(255,225,180,'+hold*.6+')');
    halo.addColorStop(1,'rgba(255,225,180,0)');
    ctx.fillStyle=halo;
    ctx.fillRect(headX-16,headY-16,32,32);
  }

  let lastSound;
  function startSound(play,independent=false) {
    if (!independent) lastSound?.();
    const sounds = play();
    const stop = () => {
      for (const sound of sounds) {
        try { sound.stop(); } catch {}
        sound.disconnect();
      }
      if (lastSound===stop) lastSound = undefined;
    };
    if (!independent) lastSound = stop;
    return stop;
  }

  function enableAudio(event) {
    if (!event.isTrusted) return;
    try {
      const audio = armAudio();
      if (!audio) return;
      audio.resume().then(()=>{
        window.removeEventListener('pointerup',enableAudio,true);
        window.removeEventListener('keydown',enableAudio,true);
        prepareRecording(audio,'minghuju-cheering.mp3');
      }).catch(()=>{});
    } catch {}
  }
  window.addEventListener('pointerup',enableAudio,true);
  window.addEventListener('keydown',enableAudio,true);

  let entranceApplauseToken;
  let stopEntranceCheer;
  window.addEventListener('minghu-entrance-applause', async () => {
    if (audioContext?.state!=='running') return;
    const token = {};
    entranceApplauseToken = token;
    const buffer = await prepareRecording(audioContext,'minghuju-cheering.mp3');
    if (buffer && entranceApplauseToken===token) {
      stopEntranceCheer = startSound(()=>playCheering(audioContext,buffer));
    }
  });
  window.addEventListener('minghu-entrance-stop', () => {
    entranceApplauseToken = undefined;
    stopEntranceCheer?.();
    stopEntranceCheer = undefined;
  });

  function shakeHead(ctx,pixels,time) {
    const beat = clamp((time-.48)/1.6);
    const shake = Math.sin(beat*4*Math.PI)*Math.sin(beat*Math.PI);
    const turnAway = smooth((time-2.03)/.72);
    warp(ctx,pixels,[278,83,108,102],(x,y)=>{
      const face = smooth((x-248)/88);
      const taper = 1-smooth((y-123)/50);
      return [
        (shake*(5+12*face)-turnAway*6*face)*taper,
        (shake*.045*(x-271)-turnAway*5*face)*taper
      ];
    });
  }

  function mountainWind(ctx,pixels,time) {
    const veil = smooth(time/.7)*(1-smooth((time-5)/1.2));
    const crowns = [[106,63,100,34,.1],[133,96,79,26,.65],[76,295,108,37,.46],
      [180,373,91,28,.84],[265,218,62,21,.33],[324,105,31,15,.52]];
    for (const [x,y,rx,ry,phase] of crowns) {
      const wind = veil*(Math.sin(2.4*time+phase)*2.7+Math.sin(4.1*time+phase)*1.1);
      warp(ctx,pixels,[x,y,rx,ry],(column,row)=>[
        wind*(.6+.4*smooth((column-x+rx)/rx)),wind*.55*(1-smooth((row-y+8)/24))
      ]);
    }
  }

  const scenes = {
    'prodigy': {duration:4.85, paint:drum, background:'prodigy', masks:drumMasks},
    'blending-tunes': {duration:4.6, paint:(ctx,pixels,time)=>blend(ctx,time)},
    'many-strings': {duration:3.5, paint:strings, readsPixels:true},
    'oriole': {duration:4.2, paint:(ctx,pixels,time,layers)=>bird(ctx,time,layers,false), background:'oriole',
      recording:'minghuju-oriole-call.wav', independentSound:true, sound:(audio,clip)=>clip?[playBuffer(audio,clip,.62,.42)]:[]},
    'swallow': {duration:4.2, paint:(ctx,pixels,time,layers)=>bird(ctx,time,layers,true), background:'swallow',
      recording:'minghuju-swallow-call.wav', independentSound:true, sound:(audio,clip)=>clip?[playBuffer(audio,clip,.54,1.8)]:[]},
    'silver-wire': {duration:3.4, paint:steelWire},
    'taishan': {duration:6.3, paint:mountainWind, readsPixels:true},
    'thunder': {duration:5.7, paint:lightning, sound:playThunder, recording:'minghuju-thunder-call.wav'},
    'jade-plate': {duration:3.9, paint:pearls, sound:playPearls},
    'mountain-serpent': {duration:5.3, paint:serpent, background:'serpent'},
    'underground-tone': {duration:3.5, paint:underground, sound:playRise},
    'fireworks': {duration:3.9, paint:fireworks, sound:playFireworks},
    'applause': {duration:5, paint:clapping, readsPixels:true, sound:playCheering, recording:'minghuju-cheering.mp3'},
    'forgotten-meal': {duration:3.8, paint:shakeHead, readsPixels:true}
  };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function playScene(art) {
    const id = art.dataset.motion;
    const scene = scenes[id];
    const reduced = motion.matches;
    if (reduced && !scene.sound) return;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.setAttribute('aria-hidden','true');
    const ctx = canvas.getContext('2d',{willReadFrequently:!!scene.readsPixels});
    if (!ctx) return;
    let frame;
    let stopSound;
    let active = true;
    const stop = ()=>{
      active = false;
      cancelAnimationFrame(frame);
      stopSound?.();
      canvas.remove();
    };

    async function start() {
      const image = art.querySelector('img');
      image.loading = 'eager';
      const backdrop = scene.background?new Image():image;
      if (scene.background) backdrop.src = 'img/minghuju-'+scene.background+'-background.jpg';
      const audio = audioContext?.state==='running'?audioContext:undefined;
      const [, ,clip] = await Promise.all([
        image.decode(),backdrop===image?undefined:backdrop.decode(),
        audio&&scene.recording?prepareRecording(audio,scene.recording):undefined
      ]);
      if (!active) return;
      if (scene.sound && audio) stopSound = startSound(()=>scene.sound(audio,clip),scene.independentSound);
      if (reduced) return;
      ctx.drawImage(backdrop,0,0,width,height);
      const pixels = scene.readsPixels?ctx.getImageData(0,0,width,height).data:undefined;
      const masks = scene.masks || birdMasks[id];
      const layers = masks?cutoutLayers(image,masks):undefined;
      if (id==='prodigy') repairDrummerTorso(image,layers[0]);
      art.append(canvas);
      const startTime = performance.now();
      function draw(now) {
        if (!active) return;
        const elapsed = Math.min(scene.duration,(now-startTime)/1000);
        ctx.drawImage(backdrop,0,0,width,height);
        scene.paint(ctx,pixels,elapsed,layers);
        if (elapsed<scene.duration) frame = requestAnimationFrame(draw);
      }
      frame = requestAnimationFrame(draw);
    }
    start().catch(stop);
    return stop;
  }

  playWhenVisible(document.querySelectorAll('[data-motion]'),playScene);
})();
