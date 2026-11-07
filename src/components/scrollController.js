import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class ScrollController {
  constructor(scene3D, tachometer) {
    this.scene3D = scene3D;
    this.tachometer = tachometer;
    this.lenis = null;
    this.init();
  }

  init() {
    // 1. Initialize Lenis Smooth Inertia Scroll
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.8
    });

    // 2. Synchronize Lenis with GSAP ScrollTrigger
    this.lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // 3. Bind Main 3D Canvas Scroll Timeline
    this.setupScrollTriggers();
  }

  setupScrollTriggers() {
    // Global Scroll Progress (0.0 to 1.0 across the entire page body)
    ScrollTrigger.create({
      trigger: '#app',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        const progress = self.progress;
        if (this.scene3D) {
          this.scene3D.updateScroll(progress);
        }
        if (this.tachometer) {
          this.tachometer.updateFromScroll(progress);
        }
      }
    });

    // Animate Section Titles & Editorial Typography on Scroll
    gsap.utils.toArray('.reveal-text').forEach((elem) => {
      gsap.fromTo(elem, 
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: elem,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });
  }
}
