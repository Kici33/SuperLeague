import {
  Home, Users, Trophy, Star, Swords, Flame, Palette,
  Wrench, Globe, UserPen, Bug, Settings, UserCircle,
} from 'lucide-react';
import type { ComponentType } from 'react';

import Dashboard from '@/pages/dashboard';
import Lobby from '@/pages/lobby';
import Challenges from '@/pages/challenges';
import Mastery from '@/pages/mastery';
import ChampionBreakdown from '@/pages/champion';
import Eternals from '@/pages/eternals';
import Skins from '@/pages/skins';
import Builds from '@/pages/builds';
import Teams from '@/pages/teams';
import Profile from '@/pages/profile';
import Accounts from '@/pages/accounts';
import Debug from '@/pages/debug';
import SettingsPage from '@/pages/settings';

export interface PageConfig {
  title: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  component: ComponentType;
  description: string;
}

export const pages: Record<string, PageConfig> = {
  dashboard: {
    title: 'Dashboard',
    icon: Home,
    component: Dashboard,
    description: 'Overview & mastery class progress',
  },
  lobby: {
    title: 'Lobby',
    icon: Users,
    component: Lobby,
    description: 'Live lobby tracker',
  },
  challenges: {
    title: 'Challenges',
    icon: Trophy,
    component: Challenges,
    description: 'Challenge progress & tokens',
  },
  mastery: {
    title: 'Mastery',
    icon: Star,
    component: Mastery,
    description: 'Champion mastery & tracking',
  },
  champion: {
    title: 'Champion',
    icon: Swords,
    component: ChampionBreakdown,
    description: 'Dedicated champion breakdown',
  },
  eternals: {
    title: 'Eternals',
    icon: Flame,
    component: Eternals,
    description: 'Eternals progress',
  },
  skins: {
    title: 'Skins',
    icon: Palette,
    component: Skins,
    description: 'Skin collection progress',
  },
  builds: {
    title: 'Builds',
    icon: Wrench,
    component: Builds,
    description: 'Champion build recommendations',
  },
  teams: {
    title: 'Teams',
    icon: Globe,
    component: Teams,
    description: 'Region team builder',
  },
  profile: {
    title: 'Profile',
    icon: UserPen,
    component: Profile,
    description: 'Customize your profile',
  },
  accounts: {
    title: 'Accounts',
    icon: UserCircle,
    component: Accounts,
    description: 'Manage & switch accounts',
  },
  debug: {
    title: 'Debug',
    icon: Bug,
    component: Debug,
    description: 'LCU API debugger',
  },
  settings: {
    title: 'Settings',
    icon: Settings,
    component: SettingsPage,
    description: 'App settings',
  },
};

export const pageKeys = Object.keys(pages) as (keyof typeof pages)[];

