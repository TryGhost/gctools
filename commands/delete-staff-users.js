import { ui } from '@tryghost/pretty-cli';
import deleteStaffUsers from '../tasks/delete-staff-users.js';

const id = 'delete-staff-users';
const group = 'Staff:';
const flags = 'delete-staff-users <apiURL> <staffAccessToken>';
const desc = 'Delete content-free staff users in selected roles (requires a staff access token)';
const paramsDesc = [
    'URL to your Ghost API',
    'Staff access token with permission to delete the selected users',
];
const deletableRoleChoices = ['Contributor', 'Author', 'Editor', 'Administrator'];

const setup = (sywac) => {
    sywac.boolean('-V --verbose', {
        defaultValue: false,
        desc: 'Show every eligible and skipped staff user',
    });
    sywac.option('--roles', {
        type: 'array:enum',
        choices: deletableRoleChoices,
        required: true,
        desc: 'Required comma-separated list of staff roles to delete',
    });
    sywac.string('--email-domain', {
        defaultValue: null,
        desc: 'Only delete staff whose email ends with this domain',
    });
    sywac.boolean('--dry-run', {
        defaultValue: false,
        desc: 'Preview eligible staff users without deleting them',
    });
    sywac.boolean('--yes', {
        defaultValue: false,
        desc: 'Confirm permanent deletion',
    });
    sywac.number('--delayBetweenCalls', {
        defaultValue: 200,
        desc: 'The delay between API calls, in ms',
    });
};

const run = async (argv) => {
    const timer = Date.now();
    const context = { errors: [] };

    try {
        const runner = deleteStaffUsers.getTaskRunner(argv);
        await runner.run(context);
    } catch (error) {
        ui.log.error(error.message, context.errors);
        return;
    }

    if (context.args.dryRun) {
        ui.log.ok(
            `Dry run complete: ${context.candidates.length} staff users would be deleted and ${context.skipped.length} were skipped in ${Date.now() - timer}ms.`,
        );
        return;
    }

    ui.log.ok(
        `Deleted ${context.deleted.length} of ${context.candidates.length} eligible staff users; skipped ${context.skipped.length}, failed ${context.failed.length} in ${Date.now() - timer}ms.`,
    );
};

export { deletableRoleChoices };

export default { id, group, flags, desc, paramsDesc, setup, run };
