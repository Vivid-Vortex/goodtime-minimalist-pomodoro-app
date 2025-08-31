import DatabaseManager from '../database';
import { TimerProfile } from '../../types';

export class ProfileService {
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
  }

  async addProfile(profileData: Omit<TimerProfile, 'name'> & { name: string }): Promise<TimerProfile> {
    const newProfile: TimerProfile = {
      ...profileData,
    };

    this.db.insertTimerProfile({
      id: crypto.randomUUID(),
      name: newProfile.name!,
      isCountdown: newProfile.isCountdown,
      workDuration: newProfile.workDuration,
      isBreakEnabled: newProfile.isBreakEnabled,
      breakDuration: newProfile.breakDuration,
      isLongBreakEnabled: newProfile.isLongBreakEnabled,
      longBreakDuration: newProfile.longBreakDuration,
      sessionsBeforeLongBreak: newProfile.sessionsBeforeLongBreak,
      workBreakRatio: newProfile.workBreakRatio
    });

    return newProfile;
  }

  async updateProfile(name: string, updates: Partial<TimerProfile>): Promise<void> {
    // First get the profile ID by name
    const profiles = this.db.getAllTimerProfiles();
    const profile = profiles.find(p => p.name === name);
    
    if (!profile) {
      throw new Error(`Profile with name '${name}' not found`);
    }

    this.db.updateTimerProfile(profile.id, updates);
  }

  async deleteProfile(name: string): Promise<void> {
    // First get the profile ID by name
    const profiles = this.db.getAllTimerProfiles();
    const profile = profiles.find(p => p.name === name);
    
    if (!profile) {
      throw new Error(`Profile with name '${name}' not found`);
    }

    this.db.deleteTimerProfile(profile.id);
  }

  async getAllProfiles(): Promise<TimerProfile[]> {
    const dbProfiles = this.db.getAllTimerProfiles();
    
    return dbProfiles.map(profile => ({
      name: profile.name,
      isCountdown: Boolean(profile.is_countdown),
      workDuration: profile.work_duration,
      isBreakEnabled: Boolean(profile.is_break_enabled),
      breakDuration: profile.break_duration,
      isLongBreakEnabled: Boolean(profile.is_long_break_enabled),
      longBreakDuration: profile.long_break_duration,
      sessionsBeforeLongBreak: profile.sessions_before_long_break,
      workBreakRatio: profile.work_break_ratio
    }));
  }

  async getProfileByName(name: string): Promise<TimerProfile | null> {
    const profiles = await this.getAllProfiles();
    return profiles.find(p => p.name === name) || null;
  }

  async clearProfiles(): Promise<void> {
    // Get all profiles except default
    const profiles = this.db.getAllTimerProfiles();
    
    // Delete each profile except default
    for (const profile of profiles) {
      if (profile.id !== 'default') {
        this.db.deleteTimerProfile(profile.id);
      }
    }
  }
}

export const profileService = new ProfileService();