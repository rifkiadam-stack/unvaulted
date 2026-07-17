import { StateEffect } from "@codemirror/state";
import { tauriPlatform } from "../session/platform";

export const embedResolutionArrived = StateEffect.define<null>();

const cache = new Map<string, string | null>();
const pending = new Set<string>();

type ResolverFn = (baseDir: string, fileName: string) => Promise<string | null>;
type DispatchFn = (effect: StateEffect<null>) => void;

let currentResolver: ResolverFn = async (baseDir, fileName) => {
    return tauriPlatform().resolveEmbed(baseDir, fileName);
};

let currentDispatch: DispatchFn | null = null;

export function setEmbedResolverForTests(fn: ResolverFn) {
    currentResolver = fn;
}

export function setEmbedDispatch(fn: DispatchFn) {
    currentDispatch = fn;
}

export function clearEmbedCacheForTests() {
    cache.clear();
    pending.clear();
}

export function seedEmbedCacheForTests(key: string, value: string | null) {
    cache.set(key, value);
}

export function getResolvedEmbed(key: string): string | null | undefined {
    return cache.get(key);
}

export function queueResolve(key: string, baseDir: string, fileName: string) {
    if (cache.has(key) || pending.has(key)) return;
    
    pending.add(key);
    
    currentResolver(baseDir, fileName).then(result => {
        cache.set(key, result);
        pending.delete(key);
        if (currentDispatch) {
            currentDispatch(embedResolutionArrived.of(null));
        }
    }).catch(err => {
        console.error("Embed resolution failed:", err);
        cache.set(key, null);
        pending.delete(key);
        if (currentDispatch) {
            currentDispatch(embedResolutionArrived.of(null));
        }
    });
}
