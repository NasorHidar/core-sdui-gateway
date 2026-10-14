package com.sdui.forge.exception;

/**
 * Thrown when a requested resource does not exist in the SDUI metadata store.
 *
 * <p>Maps to HTTP 404 in the global exception handler.</p>
 */
public class ResourceNotFoundException extends RuntimeException {

    private final String resourceType;
    private final Object resourceId;

    public ResourceNotFoundException(String resourceType, Object resourceId) {
        super(String.format("%s not found with identifier: %s", resourceType, resourceId));
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }

    public String getResourceType() {
        return resourceType;
    }

    public Object getResourceId() {
        return resourceId;
    }
}
