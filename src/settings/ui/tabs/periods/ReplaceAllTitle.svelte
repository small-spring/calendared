<script lang="ts">
    interface Props {
        replacingFormat: string;
    }

    let { replacingFormat }: Props = $props();
</script>

<!-- Calendared: the action renames notes (upstream: "Replace all formats with …") -->
Rename notes to <span class="u-pop">{replacingFormat}</span>?
