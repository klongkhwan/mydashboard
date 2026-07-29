import type { ClipSegment, DraftProject, Subtitle } from './edit-clip.types'

export type EditClipStore = {
    projects: DraftProject[]
    subtitles: Subtitle[]
    segments: ClipSegment[]
    captionIdeas: string[]
    hashtagIdeas: string[]
    highlightRange: { start: number; end: number } | null
}

export const createInitialEditClipStore = (): EditClipStore => ({
    projects: [],
    subtitles: [{ id: 's1', startTime: 1.2, endTime: 3.8, text: 'Hook the viewer in the first second' }],
    segments: [{ id: 'seg-1', start: 0, end: 0 }],
    captionIdeas: [],
    hashtagIdeas: [],
    highlightRange: null,
})
