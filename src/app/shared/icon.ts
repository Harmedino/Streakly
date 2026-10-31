import { Component, input } from '@angular/core';
import {
  LucideLayoutDashboard,
  LucideCalendarDays,
  LucideChartNoAxesCombined,
  LucideSettings2,
  LucideSprout,
  LucidePlus,
  LucideArrowUpRight,
  LucideFlame,
  LucideCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideSun,
  LucideMoon,
  LucideSearch,
  LucideX,
  LucideArrowRight,
  LucideDownload,
  LucideUpload,
  LucideEllipsis,
  LucideLeaf,
  LucideTarget,
  LucideMenu,
} from '@lucide/angular';
@Component({
  selector: 'app-icon',
  imports: [
    LucideLayoutDashboard,
    LucideCalendarDays,
    LucideChartNoAxesCombined,
    LucideSettings2,
    LucideSprout,
    LucidePlus,
    LucideArrowUpRight,
    LucideFlame,
    LucideCheck,
    LucideChevronLeft,
    LucideChevronRight,
    LucideSun,
    LucideMoon,
    LucideSearch,
    LucideX,
    LucideArrowRight,
    LucideDownload,
    LucideUpload,
    LucideEllipsis,
    LucideLeaf,
    LucideTarget,
    LucideMenu,
  ],
  template: `@switch (name()) {
    @case ('dashboard') {
      <svg lucideLayoutDashboard [size]="size()" />
    }
    @case ('calendar') {
      <svg lucideCalendarDays [size]="size()" />
    }
    @case ('chart') {
      <svg lucideChartNoAxesCombined [size]="size()" />
    }
    @case ('settings') {
      <svg lucideSettings2 [size]="size()" />
    }
    @case ('sprout') {
      <svg lucideSprout [size]="size()" />
    }
    @case ('plus') {
      <svg lucidePlus [size]="size()" />
    }
    @case ('up') {
      <svg lucideArrowUpRight [size]="size()" />
    }
    @case ('flame') {
      <svg lucideFlame [size]="size()" />
    }
    @case ('check') {
      <svg lucideCheck [size]="size()" />
    }
    @case ('left') {
      <svg lucideChevronLeft [size]="size()" />
    }
    @case ('right') {
      <svg lucideChevronRight [size]="size()" />
    }
    @case ('sun') {
      <svg lucideSun [size]="size()" />
    }
    @case ('moon') {
      <svg lucideMoon [size]="size()" />
    }
    @case ('search') {
      <svg lucideSearch [size]="size()" />
    }
    @case ('x') {
      <svg lucideX [size]="size()" />
    }
    @case ('arrow') {
      <svg lucideArrowRight [size]="size()" />
    }
    @case ('download') {
      <svg lucideDownload [size]="size()" />
    }
    @case ('upload') {
      <svg lucideUpload [size]="size()" />
    }
    @case ('more') {
      <svg lucideEllipsis [size]="size()" />
    }
    @case ('leaf') {
      <svg lucideLeaf [size]="size()" />
    }
    @case ('menu') {
      <svg lucideMenu [size]="size()" />
    }
    @default {
      <svg lucideTarget [size]="size()" />
    }
  }`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    svg {
      stroke-width: 1.7;
    }
  `,
})
export class Icon {
  name = input('sprout');
  size = input(20);
}
