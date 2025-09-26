type TimelineEvent = {
    eventType: string;
    actor: string | null;
    timestamp: string;
    details?: unknown | null;
};
interface TimelineProps {
    events: TimelineEvent[];
}
export default function Timeline({ events }: TimelineProps): import("react/jsx-runtime").JSX.Element;
export {};
