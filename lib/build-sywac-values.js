import errors from '@tryghost/errors';

function buildParams(params = []) {
    let theParams = [];

    Object.entries(params).forEach((param) => {
        const [key, value] = param;

        if (value.required) {
            theParams.push(`<${key}>`);
        } else {
            theParams.push(`[${key}]`);
        }
    });

    return theParams.join(' ');
}

function buildParamDescriptions(params = []) {
    let theDesc = [];

    Object.entries(params).forEach((param) => {
        const [key, value] = param; // eslint-disable-line no-unused-vars
        theDesc.push(value.desc);
    });

    return theDesc;
}

function buildArguments(sywac, options = []) {
    return Object.entries(options).forEach((option) => {
        const [key, value] = option; // eslint-disable-line no-unused-vars

        if (value.type === 'string') {
            sywac.string(value.flags, {
                defaultValue: value.defaultValue,
                desc: value.desc
            });
        } else if (value.type === 'number') {
            sywac.number(value.flags, {
                defaultValue: value.defaultValue,
                desc: value.desc
            });
        } else if (value.type === 'array') {
            sywac.array(value.flags, {
                defaultValue: value.defaultValue,
                choices: value.choices,
                desc: value.desc
            });
        } else if (value.type === 'enumeration') {
            sywac.enumeration(value.flags, {
                defaultValue: value.defaultValue,
                choices: value.choices,
                desc: value.desc
            });
        } else if (value.type === 'boolean') {
            sywac.boolean(value.flags, {
                defaultValue: value.defaultValue,
                desc: value.desc
            });
        } else {
            throw new errors.InternalServerError({message: `sywac type not implemented: ${value.type}`});
        }
    });
}

export {
    buildParams,
    buildParamDescriptions,
    buildArguments
};
