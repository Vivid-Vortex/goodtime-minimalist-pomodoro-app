export namespace database {
	
	export class AppSettings {
	    activeLabelName: string;
	    defaultTimerProfileName: string;
	    theme: string;
	    workFinishedSound: string;
	    breakFinishedSound: string;
	    autoStartWork: boolean;
	    autoStartBreak: boolean;
	    enableDesktopNotifications: boolean;
	    cloudBackupEnabled: boolean;
	    lastSyncTimestamp: number;
	    cloudSyncSchedule: string;
	
	    static createFrom(source: any = {}) {
	        return new AppSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.activeLabelName = source["activeLabelName"];
	        this.defaultTimerProfileName = source["defaultTimerProfileName"];
	        this.theme = source["theme"];
	        this.workFinishedSound = source["workFinishedSound"];
	        this.breakFinishedSound = source["breakFinishedSound"];
	        this.autoStartWork = source["autoStartWork"];
	        this.autoStartBreak = source["autoStartBreak"];
	        this.enableDesktopNotifications = source["enableDesktopNotifications"];
	        this.cloudBackupEnabled = source["cloudBackupEnabled"];
	        this.lastSyncTimestamp = source["lastSyncTimestamp"];
	        this.cloudSyncSchedule = source["cloudSyncSchedule"];
	    }
	}
	export class TimerProfile {
	    name: string;
	    isCountdown: boolean;
	    workDuration: number;
	    isBreakEnabled: boolean;
	    breakDuration: number;
	    isLongBreakEnabled: boolean;
	    longBreakDuration: number;
	    sessionsBeforeLongBreak: number;
	    workBreakRatio: number;
	
	    static createFrom(source: any = {}) {
	        return new TimerProfile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.isCountdown = source["isCountdown"];
	        this.workDuration = source["workDuration"];
	        this.isBreakEnabled = source["isBreakEnabled"];
	        this.breakDuration = source["breakDuration"];
	        this.isLongBreakEnabled = source["isLongBreakEnabled"];
	        this.longBreakDuration = source["longBreakDuration"];
	        this.sessionsBeforeLongBreak = source["sessionsBeforeLongBreak"];
	        this.workBreakRatio = source["workBreakRatio"];
	    }
	}
	export class Label {
	    name: string;
	    colorIndex: number;
	    orderIndex: number;
	    useDefaultProfile: boolean;
	    timerProfile: TimerProfile;
	    isArchived: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Label(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.colorIndex = source["colorIndex"];
	        this.orderIndex = source["orderIndex"];
	        this.useDefaultProfile = source["useDefaultProfile"];
	        this.timerProfile = this.convertValues(source["timerProfile"], TimerProfile);
	        this.isArchived = source["isArchived"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Session {
	    id: number;
	    timestamp: number;
	    duration: number;
	    interruptions: number;
	    labelName: string;
	    notes: string;
	    isWork: boolean;
	    isArchived: boolean;
	    deviceName: string;
	
	    static createFrom(source: any = {}) {
	        return new Session(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.timestamp = source["timestamp"];
	        this.duration = source["duration"];
	        this.interruptions = source["interruptions"];
	        this.labelName = source["labelName"];
	        this.notes = source["notes"];
	        this.isWork = source["isWork"];
	        this.isArchived = source["isArchived"];
	        this.deviceName = source["deviceName"];
	    }
	}

}

export namespace labels {
	
	export class CreateRequest {
	    name: string;
	    colorIndex: number;
	    useDefaultProfile: boolean;
	    timerProfile: database.TimerProfile;
	
	    static createFrom(source: any = {}) {
	        return new CreateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.colorIndex = source["colorIndex"];
	        this.useDefaultProfile = source["useDefaultProfile"];
	        this.timerProfile = this.convertValues(source["timerProfile"], database.TimerProfile);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class UpdateRequest {
	    name: string;
	    colorIndex: number;
	    useDefaultProfile: boolean;
	    timerProfile: database.TimerProfile;
	
	    static createFrom(source: any = {}) {
	        return new UpdateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.colorIndex = source["colorIndex"];
	        this.useDefaultProfile = source["useDefaultProfile"];
	        this.timerProfile = this.convertValues(source["timerProfile"], database.TimerProfile);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class CloudHistoryEntry {
	    dateMillis: number;
	    labelName: string;
	    minutes: number;
	    deviceName: string;
	    fetchedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new CloudHistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.dateMillis = source["dateMillis"];
	        this.labelName = source["labelName"];
	        this.minutes = source["minutes"];
	        this.deviceName = source["deviceName"];
	        this.fetchedAt = source["fetchedAt"];
	    }
	}
	export class CloudSyncStatus {
	    docsCreated: number;
	    docsUpdated: number;
	    error: string;
	    credsMissing: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CloudSyncStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.docsCreated = source["docsCreated"];
	        this.docsUpdated = source["docsUpdated"];
	        this.error = source["error"];
	        this.credsMissing = source["credsMissing"];
	    }
	}
	export class CloudTimelineEntry {
	    dateMillis: number;
	    labelName: string;
	    minutes: number;
	    fetchedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new CloudTimelineEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.dateMillis = source["dateMillis"];
	        this.labelName = source["labelName"];
	        this.minutes = source["minutes"];
	        this.fetchedAt = source["fetchedAt"];
	    }
	}

}

export namespace sessions {
	
	export class BulkEditRequest {
	    ids: number[];
	    labelName: string;
	
	    static createFrom(source: any = {}) {
	        return new BulkEditRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ids = source["ids"];
	        this.labelName = source["labelName"];
	    }
	}
	export class ListRequest {
	    labelNames: string[];
	    afterMillis: number;
	    onlyWork: boolean;
	    limit: number;
	    offset: number;
	
	    static createFrom(source: any = {}) {
	        return new ListRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.labelNames = source["labelNames"];
	        this.afterMillis = source["afterMillis"];
	        this.onlyWork = source["onlyWork"];
	        this.limit = source["limit"];
	        this.offset = source["offset"];
	    }
	}
	export class Summary {
	    totalWorkMinutes: number;
	    totalBreakMinutes: number;
	    sessionCount: number;
	    perLabel: Record<string, number>;
	
	    static createFrom(source: any = {}) {
	        return new Summary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalWorkMinutes = source["totalWorkMinutes"];
	        this.totalBreakMinutes = source["totalBreakMinutes"];
	        this.sessionCount = source["sessionCount"];
	        this.perLabel = source["perLabel"];
	    }
	}
	export class SummaryRequest {
	    afterMillis: number;
	
	    static createFrom(source: any = {}) {
	        return new SummaryRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.afterMillis = source["afterMillis"];
	    }
	}
	export class TimelineEntry {
	    dateMillis: number;
	    labelName: string;
	    minutes: number;
	
	    static createFrom(source: any = {}) {
	        return new TimelineEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.dateMillis = source["dateMillis"];
	        this.labelName = source["labelName"];
	        this.minutes = source["minutes"];
	    }
	}
	export class TimelineRequest {
	    labelNames: string[];
	    afterMillis: number;
	
	    static createFrom(source: any = {}) {
	        return new TimelineRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.labelNames = source["labelNames"];
	        this.afterMillis = source["afterMillis"];
	    }
	}
	export class UpdateRequest {
	    id: number;
	    timestamp: number;
	    duration: number;
	    interruptions: number;
	    labelName: string;
	    notes: string;
	    isWork: boolean;
	
	    static createFrom(source: any = {}) {
	        return new UpdateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.timestamp = source["timestamp"];
	        this.duration = source["duration"];
	        this.interruptions = source["interruptions"];
	        this.labelName = source["labelName"];
	        this.notes = source["notes"];
	        this.isWork = source["isWork"];
	    }
	}

}

export namespace settings {
	
	export class UpdateRequest {
	    theme: string;
	    workFinishedSound: string;
	    breakFinishedSound: string;
	    autoStartWork: boolean;
	    autoStartBreak: boolean;
	    enableDesktopNotifications: boolean;
	    cloudBackupEnabled: boolean;
	    defaultTimerProfileName: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.workFinishedSound = source["workFinishedSound"];
	        this.breakFinishedSound = source["breakFinishedSound"];
	        this.autoStartWork = source["autoStartWork"];
	        this.autoStartBreak = source["autoStartBreak"];
	        this.enableDesktopNotifications = source["enableDesktopNotifications"];
	        this.cloudBackupEnabled = source["cloudBackupEnabled"];
	        this.defaultTimerProfileName = source["defaultTimerProfileName"];
	    }
	}

}

export namespace timer {
	
	export class State {
	    kind: string;
	    timerType: string;
	    elapsedSeconds: number;
	    totalSeconds: number;
	    completedSessions: number;
	    activeLabelName: string;
	
	    static createFrom(source: any = {}) {
	        return new State(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.timerType = source["timerType"];
	        this.elapsedSeconds = source["elapsedSeconds"];
	        this.totalSeconds = source["totalSeconds"];
	        this.completedSessions = source["completedSessions"];
	        this.activeLabelName = source["activeLabelName"];
	    }
	}

}

